import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';

export class WebStack extends cdk.Stack {
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── S3 Bucket for static web hosting ───
    const websiteBucket = new s3.Bucket(this, 'SwarVaniWebBucket', {
      bucketName: `swar-vani-web-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ─── CloudFront Distribution ───
    const distribution = new cloudfront.Distribution(this, 'SwarVaniWebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      // SPA: route all 404s back to index.html for client-side routing
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // ─── Deploy built web assets to S3 ───
    new s3deploy.BucketDeployment(this, 'SwarVaniWebDeploy', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../web/dist'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Swar-Vani Web App URL (HTTPS)',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, 'WebBucketName', {
      value: websiteBucket.bucketName,
    });
  }
}
