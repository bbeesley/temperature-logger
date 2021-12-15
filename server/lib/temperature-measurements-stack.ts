import {
  Stack,
  StackProps,
  Construct,
  RemovalPolicy,
  CfnOutput,
  Duration,
} from '@aws-cdk/core';
import { AttributeType, BillingMode, Table } from '@aws-cdk/aws-dynamodb';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { Function as LambdaFunction, Runtime, Code } from '@aws-cdk/aws-lambda';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';

export class TemperatureMeasurementsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      tableName: 'temp-measurements',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'logger',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER,
      },
    });

    const measurementsHandler = new LambdaFunction(this, 'measurements', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('resources'),
      handler: 'handler.main',
      timeout: Duration.seconds(29),
      environment: {
        TABLE_NAME: table.tableName,
        API_KEY: process.env.API_KEY ?? '',
        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN ?? '',
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? '',
      },
    });

    table.grantReadWriteData(measurementsHandler);

    const api = new HttpApi(this, 'temperature-measurements', {
      apiName: 'Temperature Measurements',
      description: 'This service receives temperature measurements.',
    });

    const measurementsIntegration = new LambdaProxyIntegration({
      handler: measurementsHandler,
    });

    const [measurementsRoute] = api.addRoutes({
      path: '/measurements',
      methods: [HttpMethod.POST, HttpMethod.GET],
      integration: measurementsIntegration,
    });

    api.addRoutes({
      path: '/measurements/{loggerId}',
      methods: [HttpMethod.GET],
      integration: measurementsIntegration,
    });

    api.addRoutes({
      path: '/battery/{loggerId}',
      methods: [HttpMethod.GET],
      integration: measurementsIntegration,
    });

    api.addRoutes({
      path: '/temperature/{loggerId}',
      methods: [HttpMethod.GET],
      integration: measurementsIntegration,
    });

    new CfnOutput(this, 'MeasurementsEndpoint', {
      value: `${api.defaultStage?.url}${
        measurementsRoute.path?.replace(/^\//, '') ?? 'measurements'
      }`,
      exportName: 'endpoint',
    });
  }
}
