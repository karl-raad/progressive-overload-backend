const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const params = {
        TableName: TABLE_NAME,
        Item: {
            exerciseId: body.exerciseId,
            exerciseName: body.exerciseName,
            exerciseDate: body.exerciseDate,
            exerciseSets: body.exerciseSets || []
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
