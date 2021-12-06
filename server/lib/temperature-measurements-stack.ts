import {
  Stack,
  StackProps,
  Construct,
  RemovalPolicy,
  CfnOutput,
} from '@aws-cdk/core';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { Function as LambdaFunction, Runtime, Code } from '@aws-cdk/aws-lambda';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';

export class TemperatureMeasurementsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      tableName: 'temperature-measurements',
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER,
      },
    });

    const measurementsHandler = new LambdaFunction(this, 'API', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('resources'),
      handler: 'handler.main',
      environment: {
        TABLE_NAME: table.tableName,
        API_KEY: process.env.API_KEY ?? '',
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

    new CfnOutput(this, 'MeasurementsEndpoint', {
      value: `${api.defaultStage?.url}${
        measurementsRoute.path?.replace(/^\//, '') ?? 'measurements'
      }`,
      exportName: 'endpoint',
    });
  }
}
