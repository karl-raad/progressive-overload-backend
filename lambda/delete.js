const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const params = {
        TableName: TABLE_NAME,
        Key: { exerciseId: event.pathParameters.exerciseId },
    };

    try {
        await dynamoDb.delete(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Exercise deleted successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};