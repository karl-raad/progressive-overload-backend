const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const { v4: uuidv4 } = require('uuid');

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
};

const saveExercise = async (body, isPersonalBest) => {
    const exerciseId = uuidv4();
    const params = {
        TableName: TABLE_NAME,
        Item: {
            exerciseId: exerciseId,
            exerciseName: body.exerciseName,
            exerciseDate: body.exerciseDate,
            exerciseReps: body.exerciseReps || [],
            exerciseWeights: body.exerciseWeights || [],
            exerciseVolume: body.exerciseVolume,
            isPersonalBest: isPersonalBest,
            userEmail: body.userEmail,
            'userEmail#exerciseName': `${body.userEmail}#${body.exerciseName}`
        },
    };
    await dynamoDb.put(params).promise();
    return exerciseId;
};

const updateExercisePB = async (exerciseId, isPersonalBest) => {
    const params = {
        TableName: TABLE_NAME,
        Key: { exerciseId },
        UpdateExpression: 'set isPersonalBest = :isPB',
        ExpressionAttributeValues: {
            ':isPB': isPersonalBest,
        },
    };
    await dynamoDb.update(params).promise();
};

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const userEmail = body.userEmail;
    const exerciseName = body.exerciseName;
    const newExerciseVolume = body.exerciseVolume;

    // Define parameters to query the index
    const queryParams = {
        TableName: TABLE_NAME,
        IndexName: 'UserEmailExerciseNameIsPBIndex',
        KeyConditionExpression: '#userEmailExerciseName = :userEmailExerciseName AND isPersonalBest = :isPB',
        ExpressionAttributeNames: { '#userEmailExerciseName': 'userEmail#exerciseName' },
        ExpressionAttributeValues: {
            ':userEmailExerciseName': `${userEmail}#${exerciseName}`,
            ':isPB': 1,
        },
    };

    try {
        // Query for existing personal bests
        const result = await dynamoDb.query(queryParams).promise();

        if (result.Items.length === 0) {
            // No personal best found, save new item with isPersonalBest = 1
            const exerciseId = await saveExercise(body, 1);
            return {
                statusCode: 201,
                headers: corsHeaders,
                body: JSON.stringify({ exerciseId: exerciseId, message: 'Exercise created as personal best successfully' }),
            };
        } else {
            // Personal best found, check volume
            const existingPB = result.Items[0];
            if (newExerciseVolume > existingPB.exerciseVolume) {
                // Update existing personal best to isPersonalBest = 0
                await updateExercisePB(existingPB.exerciseId, 0);
                // Save new exercise as personal best
                const exerciseId = await saveExercise(body, 1);
                return {
                    statusCode: 201,
                    headers: corsHeaders,
                    body: JSON.stringify({ exerciseId: exerciseId, message: 'Exercise created as personal best after updating existing PB' }),
                };
            } else {
                // Just save new exercise with isPersonalBest = 0
                const exerciseId = await saveExercise(body, 0);
                return {
                    statusCode: 201,
                    headers: corsHeaders,
                    body: JSON.stringify({ exerciseId: exerciseId, message: 'Exercise created successfully, not a personal best' }),
                };
            }
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};