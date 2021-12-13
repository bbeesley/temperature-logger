#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { TemperatureMeasurementsStack } from '../lib/temperature-measurements-stack';

const app = new App();
new TemperatureMeasurementsStack(app, 'TemperatureMeasurementsStack', {
  env: { account: process.env.AWS_ACCOUNT_ID, region: 'eu-west-1' },
});
