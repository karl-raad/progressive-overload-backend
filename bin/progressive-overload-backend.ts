#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProgressiveOverloadBackendStack } from '../lib/progressive-overload-backend-stack';
import { ProgressiveOverloadDevStack } from '../lib/progressive-overload-backend-dev-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage');

if (stage === 'dev')
  new ProgressiveOverloadDevStack(app, 'ProgressiveOverloadDevStack');
else
  new ProgressiveOverloadBackendStack(app, 'ProgressiveOverloadBackendStack');