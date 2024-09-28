const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const params = {
        TableName: TABLE_NAME,
        Key: { exerciseId: event.pathParameters.exerciseId },
        UpdateExpression: 'set exerciseName = :exerciseName, exerciseDate = :exerciseDate, exerciseReps = :exerciseReps, exerciseWeights = :exerciseWeights, exerciseVolume = :exerciseVolume',
        ExpressionAttributeValues: {
            ':exerciseName': body.exerciseName,
            ':exerciseDate': body.exerciseDate,
            ':exerciseReps': body.exerciseReps || [],
            ':exerciseWeights': body.exerciseWeights || [],
            ':exerciseVolume': body.exerciseVolume
        },
        ReturnValues: 'UPDATED_NEW',
    };
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    };
    try {
        const existingItem = await dynamoDb.get(params).promise();
        if (!existingItem.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Exercise not found' }),
            };
        }
        await dynamoDb.update(params).promise();
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Exercise updated successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
