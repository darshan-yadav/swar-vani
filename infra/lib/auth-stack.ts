import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── Cognito User Pool ───
    this.userPool = new cognito.UserPool(this, 'SwarVaniUserPool', {
      userPoolName: 'swar-vani-users',
      selfSignUpEnabled: true,
      signInAliases: {
        phone: true,
      },
      autoVerify: {
        phone: true,
      },
      standardAttributes: {
        phoneNumber: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        storeId: new cognito.StringAttribute({ mutable: true }),
        language: new cognito.StringAttribute({ mutable: true }),
        storeName: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.PHONE_ONLY_WITHOUT_MFA,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─── App Client ───
    this.userPoolClient = this.userPool.addClient('SwarVaniAppClient', {
      userPoolClientName: 'swar-vani-app',
      authFlows: {
        userSrp: true,
        custom: true,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
  }
}
