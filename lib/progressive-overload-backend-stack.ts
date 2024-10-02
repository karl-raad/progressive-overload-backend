import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class ProgressiveOverloadBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'ProgressiveOverloadUserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      }
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true
      },
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    // Create a DynamoDB table
    const exercisesTable = new dynamodb.Table(this, 'ExercisesTable', {
      partitionKey: { name: 'exerciseId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    exercisesTable.addGlobalSecondaryIndex({
      indexName: 'UserEmailIndex',
      partitionKey: { name: 'userEmail', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'exerciseDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    exercisesTable.addGlobalSecondaryIndex({
      indexName: 'UserEmailExerciseNameIndex',
      partitionKey: { name: 'userEmail#exerciseName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'exerciseDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    exercisesTable.addGlobalSecondaryIndex({
      indexName: 'UserEmailIsPBIndex',
      partitionKey: { name: 'userEmail', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'isPersonalBest', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    exercisesTable.addGlobalSecondaryIndex({
      indexName: 'UserEmailExerciseNameIsPBIndex',
      partitionKey: { name: 'userEmail#exerciseName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'isPersonalBest', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    const exercisesDataTable = new dynamodb.Table(this, 'ExercisesDataTable', {
      partitionKey: { name: 'exerciseDataId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create Lambda functions for each CRUD operation
    const createFunction = new lambda.Function(this, 'CreateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist/exercises'),
      handler: 'create.handler',
      environment: {
        TABLE_NAME: exercisesTable.tableName,
      },
    });

    const readFunction = new lambda.Function(this, 'ReadFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist/exercises'),
      handler: 'read.handler',
      environment: {
        TABLE_NAME: exercisesTable.tableName,
      },
    });

    const updateFunction = new lambda.Function(this, 'UpdateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist/exercises'),
      handler: 'update.handler',
      environment: {
        TABLE_NAME: exercisesTable.tableName,
      },
    });

    const deleteFunction = new lambda.Function(this, 'DeleteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist/exercises'),
      handler: 'delete.handler',
      environment: {
        TABLE_NAME: exercisesTable.tableName,
      },
    });

    const initFunction = new lambda.Function(this, 'InitDataFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist/exercisesData'),
      handler: 'init.handler',
      environment: {
        TABLE_NAME: exercisesDataTable.tableName,
      },
      timeout: cdk.Duration.seconds(10)
    });

    const readDataFunction = new lambda.Function(this, 'ReadDataFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist/exercisesData'),
      handler: 'read.handler',
      environment: {
        TABLE_NAME: exercisesDataTable.tableName,
      },
    });

    // Grant Lambda functions access to the DynamoDB table
    exercisesTable.grantReadWriteData(createFunction);
    exercisesTable.grantReadWriteData(readFunction);
    exercisesTable.grantReadWriteData(updateFunction);
    exercisesTable.grantReadWriteData(deleteFunction);
    exercisesDataTable.grantReadWriteData(initFunction);
    exercisesDataTable.grantReadData(readDataFunction);

    new cr.AwsCustomResource(this, 'InitResource', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: initFunction.functionArn,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [initFunction.functionArn],
        }),
      ]),
    });

    // Create an API Gateway
    const api = new apigateway.RestApi(this, 'ExercisesApi', {
      restApiName: 'Exercises Service',
      description: 'This service serves exercises.',
      deployOptions: {
        stageName: this.node.tryGetContext('stage') || 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      }
    });

    const corsParams = {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        },
      }]
    };

    // Define API Gateway resources and methods
    const exercises = api.root.addResource('exercises');
    exercises.addMethod('POST', new apigateway.LambdaIntegration(createFunction), corsParams);
    exercises.addMethod('GET', new apigateway.LambdaIntegration(readFunction), corsParams);

    const exercise = exercises.addResource('{exerciseId}');
    exercise.addMethod('PUT', new apigateway.LambdaIntegration(updateFunction), corsParams);
    exercise.addMethod('DELETE', new apigateway.LambdaIntegration(deleteFunction), corsParams);

    const exercisesData = api.root.addResource('exercises-data');
    exercisesData.addMethod('GET', new apigateway.LambdaIntegration(readDataFunction), corsParams);
  }
}
