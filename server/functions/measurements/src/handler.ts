import { HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

async function post(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const measurement = JSON.parse(event.body ?? '{}');
  const { temperature, humidity, pressure } = measurement;
  await dynamo.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: { timestamp: Date.now(), temperature, humidity, pressure },
    })
  );
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok' }, null, 2),
  };
}
async function get(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const measurement = JSON.parse(event.body ?? '{}');
  const { temperature, humidity, pressure } = measurement;
  await dynamo.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: { timestamp: Date.now(), temperature, humidity, pressure },
    })
  );
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok' }, null, 2),
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
    if (event.requestContext.http.method === HttpMethod.GET) {
      const res = await get(event);
      return res;
    }
    if (event.requestContext.http.method === HttpMethod.POST) {
      const res = await post(event);
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
