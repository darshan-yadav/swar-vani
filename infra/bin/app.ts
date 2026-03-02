#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/data-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { AiStack } from '../lib/ai-stack';
import { WebStack } from '../lib/web-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const dataStack = new DataStack(app, 'SwarVaniDataStack', { env });
const authStack = new AuthStack(app, 'SwarVaniAuthStack', { env });
const apiStack = new ApiStack(app, 'SwarVaniApiStack', {
  env,
  table: dataStack.table,
  bucket: dataStack.bucket,
  userPool: authStack.userPool,
});
const aiStack = new AiStack(app, 'SwarVaniAiStack', {
  env,
  table: dataStack.table,
});

// ─── Static Web Hosting (S3 + CloudFront) ───
const webStack = new WebStack(app, 'SwarVaniWebStack', { env });
