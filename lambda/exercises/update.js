const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const userEmail = body.userEmail;
    const exerciseName = body.exerciseName;

    const params = {
        TableName: TABLE_NAME,
        Key: { exerciseId: event.pathParameters.exerciseId },
        UpdateExpression: 'set exerciseReps = :exerciseReps, exerciseWeights = :exerciseWeights, exerciseVolume = :exerciseVolume, isPersonalBest = :isPersonalBest',
        ExpressionAttributeValues: {
            ':exerciseReps': body.exerciseReps || [],
            ':exerciseWeights': body.exerciseWeights || [],
            ':exerciseVolume': body.exerciseVolume,
            ':isPersonalBest': body.isPersonalBest || 0
        },
        ReturnValues: 'UPDATED_NEW',
    };

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    };

    try {
        // First, check for existing personal best entries
        const personalBestParams = {
            TableName: TABLE_NAME,
            IndexName: 'UserEmailExerciseNameIsPBIndex',
            KeyConditionExpression: '#userEmailExerciseName = :userEmailExerciseName and isPersonalBest = :isPersonalBest',
            ExpressionAttributeNames: { '#userEmailExerciseName': 'userEmail#exerciseName' },
            ExpressionAttributeValues: {
                ':userEmailExerciseName': `${userEmail}#${exerciseName}`,
                ':isPersonalBest': 1
            }
        };

        const personalBestResult = await dynamoDb.query(personalBestParams).promise();

        if (personalBestResult.Items.length === 0)
            // No personal best found, save with isPersonalBest = 1
            params.ExpressionAttributeValues[':isPersonalBest'] = 1;
        else {
            // Personal best exists, check volumes
            const existingPB = personalBestResult.Items[0];
            if (body.exerciseVolume > existingPB.exerciseVolume) {
                // Update existing PB to 0 and save new item with isPersonalBest = 1
                await dynamoDb.update({
                    TableName: TABLE_NAME,
                    Key: { exerciseId: existingPB.exerciseId },
                    UpdateExpression: 'set isPersonalBest = :isPersonalBest',
                    ExpressionAttributeValues: {
                        ':isPersonalBest': 0
                    }
                }).promise();

                params.ExpressionAttributeValues[':isPersonalBest'] = 1;
            } else
                params.ExpressionAttributeValues[':isPersonalBest'] = 0;
        }

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