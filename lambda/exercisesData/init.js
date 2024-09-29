const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const exercisesData = require('../../data/exercisesData').default; // Adjusted import

exports.handler = async (event) => {
    const existingData = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();

    if (existingData.Items.length > 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Exercises already initialized.' }),
        };
    }

    // Ensure exercisesData is defined
    if (!Array.isArray(exercisesData)) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Exercises data is not available.' }),
        };
    }

    const promises = exercisesData.map((exercise) => {
        return dynamoDb.put({
            TableName: TABLE_NAME,
            Item: exercise,
        }).promise();
    });

    try {
        await Promise.all(promises);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Exercises initialized successfully.' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
