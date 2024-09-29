const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const userEmail = body.userEmail;
    const params = {
        TableName: TABLE_NAME,
        Item: {
            exerciseId: uuidv4(),
            exerciseName: body.exerciseName,
            exerciseDate: body.exerciseDate,
            exerciseReps: body.exerciseReps || [],
            exerciseWeights: body.exerciseWeights || [],
            exerciseVolume: body.exerciseVolume,
            userEmail: userEmail,
            'userEmail#exerciseName': `${body.userEmail}#${body.exerciseName}`
        },
    };
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    };
    try {
        await dynamoDb.put(params).promise();
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Exercise created successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
