import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class ProgressiveOverloadBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table
    const table = new dynamodb.Table(this, 'ExercisesTable', {
      partitionKey: { name: 'exerciseId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create Lambda functions for each CRUD operation
    const createFunction = new lambda.Function(this, 'CreateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'create.handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const readFunction = new lambda.Function(this, 'ReadFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'read.handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const updateFunction = new lambda.Function(this, 'UpdateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'update.handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const deleteFunction = new lambda.Function(this, 'DeleteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'delete.handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Grant Lambda functions access to the DynamoDB table
    table.grantReadWriteData(createFunction);
    table.grantReadWriteData(readFunction);
    table.grantReadWriteData(updateFunction);
    table.grantReadWriteData(deleteFunction);

    // Create an API Gateway
    const api = new apigateway.RestApi(this, 'ExercisesApi', {
      restApiName: 'Exercises Service',
      description: 'This service serves exercises.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      }
    });

    // Define API Gateway resources and methods
    const exercises = api.root.addResource('exercises');
    exercises.addMethod('POST', new apigateway.LambdaIntegration(createFunction));
    exercises.addMethod('GET', new apigateway.LambdaIntegration(readFunction));

    const exercise = exercises.addResource('{exerciseId}');
    exercise.addMethod('PUT', new apigateway.LambdaIntegration(updateFunction));
    exercise.addMethod('DELETE', new apigateway.LambdaIntegration(deleteFunction));
  }
}
