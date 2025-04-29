const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
};

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        const { userEmail, exerciseDataName } = body;

        if (!userEmail || !exerciseDataName) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'userEmail and exerciseDataName are required' }),
            };
        }

        const userEmailExerciseDataName = `${userEmail}#${exerciseDataName}`;

        const params = {
            TableName: TABLE_NAME,
            Item: {
                userEmailExerciseDataName: userEmailExerciseDataName,
                userEmail,
                exerciseDataName,
            },
            ConditionExpression: 'attribute_not_exists(userEmailExerciseDataName)'
        };

        await dynamoDb.put(params).promise();

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                userEmailExerciseDataName,
                message: 'Exercise data created successfully',
            }),
        };

    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Exercise data already exists' }),
            };
        }

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
