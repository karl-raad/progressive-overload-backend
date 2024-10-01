const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const userEmail = event.queryStringParameters.userEmail;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    };
    const params = {
        TableName: TABLE_NAME,
        IndexName: 'UserEmailIsPBIndex',
        KeyConditionExpression: 'userEmail = :email and isPersonalBest = :isPB',
        ExpressionAttributeValues: {
            ':email': userEmail,
            ':isPB': 1
        }
    };

    try {
        const data = await docClient.query(params).promise();
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Could not query personal bests' }),
        };
    }
};