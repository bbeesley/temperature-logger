import { HttpMethod } from './@types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

async function postMeasurements(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const measurement = JSON.parse(event.body ?? '{}');
  await dynamo.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: { ...measurement, timestamp: Date.now() },
    })
  );
  return {
    statusCode: 201,
    body: JSON.stringify({ status: 'ok' }, null, 2),
  };
}

async function getMeasurements(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  let res: ScanCommandOutput;
  if (event.pathParameters?.loggerId) {
    const { loggerId } = event.pathParameters;
    res = await dynamo.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: '#logger = :loggerId',
        ExpressionAttributeNames: {
          '#logger': 'logger',
        },
        ExpressionAttributeValues: {
          ':loggerId': loggerId,
        },
        ScanIndexForward: false,
      })
    );
  } else {
    res = await dynamo.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME,
      })
    );
  }
  return {
    statusCode: 200,
    body: JSON.stringify(
      res.Items?.map((i) => ({
        ...i,
        dateTime: new Date(i.timestamp).toISOString(),
      })),
      null,
      2
    ),
  };
}

async function getBatteryLevel(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const { loggerId = 'logger01' } = event.pathParameters ?? {};
  const res = await dynamo.send(
    new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: '#logger = :loggerId',
      ExpressionAttributeNames: {
        '#logger': 'logger',
      },
      ExpressionAttributeValues: {
        ':loggerId': loggerId,
      },
      Limit: 1,
      ScanIndexForward: false,
    })
  );
  if ((res.Items ?? []).length > 0) {
    const latest = res.Items?.pop() ?? {};
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          batteryLevel: latest.charge,
          dateTime: new Date(latest.timestamp).toISOString(),
        },
        null,
        2
      ),
    };
  }
  return {
    statusCode: 404,
    body: JSON.stringify({
      message: 'unknown device',
    }),
  };
}

async function getTemperature(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const { loggerId = 'logger01' } = event.pathParameters ?? {};
  const res = await dynamo.send(
    new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: '#logger = :loggerId',
      ExpressionAttributeNames: {
        '#logger': 'logger',
      },
      ExpressionAttributeValues: {
        ':loggerId': loggerId,
      },
      Limit: 1,
      ScanIndexForward: false,
    })
  );
  if ((res.Items ?? []).length > 0) {
    const latest = res.Items?.pop() ?? {};
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          temperature: latest.temperature,
          humidity: latest.humidity,
          dateTime: new Date(latest.timestamp).toISOString(),
        },
        null,
        2
      ),
    };
  }
  return {
    statusCode: 404,
    body: JSON.stringify({
      message: 'unknown device',
    }),
  };
}

export async function main(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const key = event.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'missing api key' }, null, 2),
    };
  }
  try {
    if (event.rawPath.startsWith('/measurements')) {
      if (event.requestContext.http.method === HttpMethod.GET) {
        const res = await getMeasurements(event);
        return res;
      }
      if (event.requestContext.http.method === HttpMethod.POST) {
        const res = await postMeasurements(event);
        return res;
      }
    }
    if (event.rawPath.startsWith('/battery')) {
      const res = await getBatteryLevel(event);
      return res;
    }
    if (event.rawPath.startsWith('/temperature')) {
      const res = await getTemperature(event);
      return res;
    }
    throw new Error(`unsupported method "${event.requestContext.http.method}"`);
  } catch (err) {
    console.error(err);
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          status: 'failed',
          message: err instanceof Error ? err.message : 'unknown error',
        },
        null,
        2
      ),
    };
  }
}
