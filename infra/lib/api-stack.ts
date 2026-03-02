import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  bucket: s3.Bucket;
  userPool: cognito.UserPool;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table, bucket, userPool } = props;

    // ─── API Gateway ───
    this.api = new apigateway.RestApi(this, 'SwarVaniApi', {
      restApiName: 'Swar-Vani API',
      description: 'Voice-first AI procurement platform for kirana stores',
      deployOptions: {
        stageName: 'dev',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Store-Id'],
      },
    });

    // Common Lambda environment
    const commonEnv = {
      TABLE_NAME: table.tableName,
      BUCKET_NAME: bucket.bucketName,
      REGION: 'us-east-1',
    };

    // Common bundling options
    const bundlingOptions: lambdaNode.BundlingOptions = {
      minify: true,
      sourceMap: true,
      target: 'es2022',
      format: lambdaNode.OutputFormat.CJS,
      externalModules: ['@aws-sdk/*'],
    };

    // ─── Lambda Functions ───
    const srcDir = path.join(__dirname, '..', '..', 'src');

    const productsHandler = new lambdaNode.NodejsFunction(this, 'ProductsHandler', {
      functionName: 'swar-vani-products',
      entry: path.join(srcDir, 'handlers', 'products.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
      bundling: bundlingOptions,
    });

    const inventoryHandler = new lambdaNode.NodejsFunction(this, 'InventoryHandler', {
      functionName: 'swar-vani-inventory',
      entry: path.join(srcDir, 'handlers', 'inventory.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
      bundling: bundlingOptions,
    });

    const ordersHandler = new lambdaNode.NodejsFunction(this, 'OrdersHandler', {
      functionName: 'swar-vani-orders',
      entry: path.join(srcDir, 'handlers', 'orders.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
      bundling: bundlingOptions,
    });

    const pricesHandler = new lambdaNode.NodejsFunction(this, 'PricesHandler', {
      functionName: 'swar-vani-prices',
      entry: path.join(srcDir, 'handlers', 'prices.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: commonEnv,
      bundling: bundlingOptions,
    });

    const conversationHandler = new lambdaNode.NodejsFunction(this, 'ConversationHandler', {
      functionName: 'swar-vani-conversation',
      entry: path.join(srcDir, 'handlers', 'conversation.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30), // Longer timeout for Bedrock calls
      memorySize: 512,
      environment: {
        ...commonEnv,
        BEDROCK_MODEL_ID: 'amazon.nova-lite-v1:0',
      },
      bundling: bundlingOptions,
    });

    const voiceHandler = new lambdaNode.NodejsFunction(this, 'VoiceHandler', {
      functionName: 'swar-vani-voice',
      entry: path.join(srcDir, 'handlers', 'voice.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60), // Transcribe polling takes time
      memorySize: 512,
      environment: {
        ...commonEnv,
        BEDROCK_MODEL_ID: 'amazon.nova-lite-v1:0',
      },
      bundling: bundlingOptions,
    });

    const authHandler = new lambdaNode.NodejsFunction(this, 'AuthHandler', {
      functionName: 'swar-vani-auth',
      entry: path.join(srcDir, 'handlers', 'auth.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        ...commonEnv,
        USER_POOL_ID: userPool.userPoolId,
      },
      bundling: bundlingOptions,
    });

    const analyticsHandler = new lambdaNode.NodejsFunction(this, 'AnalyticsHandler', {
      functionName: 'swar-vani-analytics',
      entry: path.join(srcDir, 'handlers', 'analytics.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
      bundling: bundlingOptions,
    });

    const ondcHandler = new lambdaNode.NodejsFunction(this, 'OndcHandler', {
      functionName: 'swar-vani-ondc',
      entry: path.join(srcDir, 'handlers', 'ondc.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
      bundling: bundlingOptions,
    });

    // ─── Grant DynamoDB Permissions ───
    table.grantReadData(productsHandler);
    table.grantReadWriteData(inventoryHandler);
    table.grantReadWriteData(ordersHandler);
    table.grantReadData(pricesHandler);
    table.grantReadWriteData(conversationHandler);
    table.grantReadWriteData(ondcHandler);

    // Grant permissions for voice handler
    table.grantReadWriteData(voiceHandler);
    bucket.grantReadWrite(voiceHandler);

    // Grant DynamoDB read for analytics
    table.grantReadData(analyticsHandler);
    voiceHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      })
    );
    voiceHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['transcribe:StartTranscriptionJob', 'transcribe:GetTranscriptionJob'],
        resources: ['*'],
      })
    );
    voiceHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      })
    );

    // Grant S3 for audio
    bucket.grantReadWrite(conversationHandler);

    // Grant Bedrock invoke for conversation handler
    conversationHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      })
    );

    // ─── API Routes ───

    // Products
    const products = this.api.root.addResource('products');
    const productsSearch = products.addResource('search');
    productsSearch.addMethod('GET', new apigateway.LambdaIntegration(productsHandler));

    // Inventory
    const inventory = this.api.root.addResource('inventory');
    inventory.addMethod('GET', new apigateway.LambdaIntegration(inventoryHandler));
    const inventoryProduct = inventory.addResource('{productId}');
    inventoryProduct.addMethod('PUT', new apigateway.LambdaIntegration(inventoryHandler));

    // Orders
    const orders = this.api.root.addResource('orders');
    orders.addMethod('GET', new apigateway.LambdaIntegration(ordersHandler));
    orders.addMethod('POST', new apigateway.LambdaIntegration(ordersHandler));
    const orderId = orders.addResource('{id}');
    const orderConfirm = orderId.addResource('confirm');
    orderConfirm.addMethod('POST', new apigateway.LambdaIntegration(ordersHandler));

    // Prices
    const prices = this.api.root.addResource('prices');
    const pricesProduct = prices.addResource('{productId}');
    pricesProduct.addMethod('GET', new apigateway.LambdaIntegration(pricesHandler));

    // Conversation
    const conversation = this.api.root.addResource('conversation');
    conversation.addMethod('POST', new apigateway.LambdaIntegration(conversationHandler));
    const conversationId = conversation.addResource('{id}');
    const conversationMessage = conversationId.addResource('message');
    conversationMessage.addMethod('POST', new apigateway.LambdaIntegration(conversationHandler));
    const conversationAudio = conversationId.addResource('audio');
    conversationAudio.addMethod('POST', new apigateway.LambdaIntegration(voiceHandler));

    // Auth
    const auth = this.api.root.addResource('auth');
    const authRegister = auth.addResource('register');
    authRegister.addMethod('POST', new apigateway.LambdaIntegration(authHandler));
    const authVerify = auth.addResource('verify');
    authVerify.addMethod('POST', new apigateway.LambdaIntegration(authHandler));

    // Analytics
    const analytics = this.api.root.addResource('analytics');
    analytics.addMethod('GET', new apigateway.LambdaIntegration(analyticsHandler));

    // ONDC
    const ondc = this.api.root.addResource('ondc');
    const ondcCatalog = ondc.addResource('catalog');
    ondcCatalog.addMethod('GET', new apigateway.LambdaIntegration(ondcHandler));
    const ondcOrders = ondc.addResource('orders');
    ondcOrders.addMethod('GET', new apigateway.LambdaIntegration(ondcHandler));
    const ondcSync = ondc.addResource('sync');
    ondcSync.addMethod('POST', new apigateway.LambdaIntegration(ondcHandler));
    const ondcStats = ondc.addResource('stats');
    ondcStats.addMethod('GET', new apigateway.LambdaIntegration(ondcHandler));

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'ApiUrl', { value: this.api.url });
  }
}
