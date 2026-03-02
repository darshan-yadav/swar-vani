import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface AiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

/**
 * AI Stack — Placeholder for Bedrock Agents and Knowledge Base
 *
 * Phase 2 will add:
 * - Bedrock Agent for kirana store procurement
 * - Knowledge Base with product catalog + pricing
 * - Action groups for inventory/ordering
 * - Guardrails for safe responses
 */
export class AiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AiStackProps) {
    super(scope, id, props);

    const { table: _table } = props;

    // ─── Placeholder outputs ───
    // Bedrock Agent and Knowledge Base will be added here in Phase 2
    // For now, the conversation handler uses direct Bedrock model invocation

    new cdk.CfnOutput(this, 'AiStatus', {
      value: 'PLACEHOLDER — Bedrock Agent to be configured in Phase 2',
    });

    // TODO Phase 2:
    // 1. Create S3 bucket for knowledge base documents
    // 2. Create Bedrock Knowledge Base with product catalog
    // 3. Create Bedrock Agent with action groups:
    //    - SearchProducts: search product catalog
    //    - CheckInventory: check store inventory
    //    - ComparePrices: compare supplier prices
    //    - CreateOrder: create draft order
    //    - ConfirmOrder: confirm and place order
    // 4. Create Guardrails:
    //    - Block non-procurement topics
    //    - Require confirmation before orders > ₹5000
    //    - Filter PII from logs
  }
}
