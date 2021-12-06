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

    const handler = new LambdaFunction(this, 'Receive', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('resources'),
      handler: 'handler.main',
      environment: {
        TABLE_NAME: table.tableName,
        API_KEY: process.env.API_KEY ?? '',
      },
    });

    table.grantReadWriteData(handler);

    const api = new HttpApi(this, 'temperature-measurements', {
      apiName: 'Temperature Measurements',
      description: 'This service receives temperature measurements.',
    });

    const postMeasurementsIntegration = new LambdaProxyIntegration({
      handler,
    });

    const [measurementsRoute] = api.addRoutes({
      path: '/measurements',
      methods: [HttpMethod.POST],
      integration: postMeasurementsIntegration,
    });

    new CfnOutput(this, 'measurements-endpoint', {
      value: `${api.defaultStage?.url}${
        measurementsRoute.path ?? '/measurements'
      }`,
      exportName: 'endpoint',
    });
  }
}
