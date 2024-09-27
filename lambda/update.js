const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const params = {
        TableName: TABLE_NAME,
        Key: { exerciseId: event.pathParameters.exerciseId },
        UpdateExpression: 'set exerciseName = :exerciseName, exerciseDate = :exerciseDate, exerciseSets = :exerciseSets',
        ExpressionAttributeValues: {
            ':exerciseName': body.exerciseName,
            ':exerciseDate': body.exerciseDate,
            ':exerciseSets': body.exerciseSets || []
        },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        await dynamoDb.update(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Exercise updated successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
