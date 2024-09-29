const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const userEmail = event.queryStringParameters.userEmail;
    const exerciseName = event.queryStringParameters.exerciseName;
    const startDate = event.queryStringParameters.startDate;
    const endDate = event.queryStringParameters.endDate;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    };

    if (!userEmail || !startDate || !endDate) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' }),
        };
    }

    let params;
    if (!exerciseName)
        params = {
            TableName: TABLE_NAME,
            IndexName: 'UserEmailIndex',
            KeyConditionExpression: 'userEmail = :userEmail and exerciseDate BETWEEN :startKey and :endKey',
            ExpressionAttributeValues: {
                ':userEmail': userEmail,
                ':startKey': startDate,
                ':endKey': endDate
            }
        };
    else
        params = {
            TableName: TABLE_NAME,
            IndexName: 'UserEmailExerciseNameIndex',
            KeyConditionExpression: '#userEmailExerciseName = :userEmailExerciseName AND exerciseDate BETWEEN :startKey AND :endKey',
            ExpressionAttributeNames: { '#userEmailExerciseName': 'userEmail#exerciseName' },
            ExpressionAttributeValues: {
                ':userEmailExerciseName': `${userEmail}#${exerciseName}`,
                ':startKey': startDate,
                ':endKey': endDate,
            },
        };

    try {
        const data = await dynamoDb.query(params).promise();
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
