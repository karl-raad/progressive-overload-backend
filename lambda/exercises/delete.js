const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const exerciseIdToDelete = event.pathParameters.exerciseId;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    };
    try {
        // Get the exercise details before deleting
        const getParams = {
            TableName: TABLE_NAME,
            Key: { exerciseId: exerciseIdToDelete },
        };
        const existingItem = await dynamoDb.get(getParams).promise();
        if (!existingItem.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Exercise not found' }),
            };
        }

        const isPersonalBest = existingItem.Item.isPersonalBest;
        const exerciseName = existingItem.Item.exerciseName;
        const userEmail = existingItem.Item.userEmail;
        const userEmailExerciseNameKey = `${userEmail}#${exerciseName}`;

        await dynamoDb.delete(getParams).promise();

        if (isPersonalBest === 1) {
            // If deleting a personal best, find the next highest volume with the same name and userEmail
            const queryParams = {
                TableName: TABLE_NAME,
                IndexName: 'UserEmailExerciseNameIsPBIndex',
                KeyConditionExpression: '#userEmailExerciseName = :userEmailExerciseName AND isPersonalBest = :isPB',
                ExpressionAttributeNames: {
                    '#userEmailExerciseName': 'userEmail#exerciseName',
                },
                ExpressionAttributeValues: {
                    ':userEmailExerciseName': userEmailExerciseNameKey,
                    ':isPB': 0,
                },
            };

            const queryResult = await dynamoDb.query(queryParams).promise();

            if (queryResult.Items.length > 0) {
                // Find the item with the highest volume
                const highestVolumeExercise = queryResult.Items.reduce((prev, current) => {
                    return (prev.exerciseVolume > current.exerciseVolume) ? prev : current;
                });

                // Update this exercise's isPersonalBest to 1
                const updateParams = {
                    TableName: TABLE_NAME,
                    Key: { exerciseId: highestVolumeExercise.exerciseId },
                    UpdateExpression: 'set isPersonalBest = :isPB',
                    ExpressionAttributeValues: {
                        ':isPB': 1,
                    },
                };
                await dynamoDb.update(updateParams).promise();
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Exercise deleted successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};