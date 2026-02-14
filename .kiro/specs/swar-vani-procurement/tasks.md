# Implementation Plan: Swar-Vani Procurement System

## Overview

This implementation plan breaks down the Swar-Vani Procurement System into incremental coding tasks. The system will be built using Python with a focus on the multi-agent architecture, voice interface integration, and external service connections. Each task builds on previous work, with property-based tests integrated throughout to catch errors early.

## Tasks

- [ ] 1. Set up project structure and core infrastructure
  - Create Python project with virtual environment
  - Set up directory structure: `src/agents/`, `src/services/`, `src/models/`, `src/utils/`, `tests/`
  - Configure dependencies: `fastapi`, `pydantic`, `hypothesis`, `pytest`, `httpx`, `sqlalchemy`
  - Create configuration management for API keys and service endpoints
  - Set up logging infrastructure with structured logging
  - _Requirements: 20.1, 20.4_

- [ ] 2. Implement core data models
  - [ ] 2.1 Create Pydantic models for all data structures
    - Implement `StoreProfile`, `Location`, `StorePreferences`, `BudgetLimits`
    - Implement `CatalogItem`, `InventoryItem`, `StockTransaction`
    - Implement `SessionContext`, `ConversationTurn`, `Intent`
    - Implement `Transaction`, `OfflineCache`, `CachedPrice`
    - Add validation rules and field constraints
    - _Requirements: 1.1, 2.1, 5.1, 12.5_
  
  - [ ]* 2.2 Write property test for data model validation
    - **Property 1: Voice Input Extraction Completeness**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.3 Write unit tests for data model edge cases
    - Test invalid GSTIN formats
    - Test negative prices and quantities
    - Test date boundary conditions
    - _Requirements: 1.1, 2.1_

- [ ] 3. Implement voice interface service wrappers
  - [ ] 3.1 Create ASR service client (Saaras v3)
    - Implement `ASRService` class with `transcribe()` and `stream_transcribe()` methods
    - Add support for 22 Indian languages
    - Handle code-mixing and transliteration
    - Implement confidence scoring and error handling
    - _Requirements: 1.5, 10.1, 10.5_
  
  - [ ] 3.2 Create TTS service client (Bulbul v3)
    - Implement `TTSService` class with `synthesize()` and `generate_confirmation()` methods
    - Support 11 languages with customizable pitch and pace
    - Implement audio cue generation for different states
    - _Requirements: 1.4, 6.4, 15.4, 16.1_
  
  - [ ] 3.3 Create OCR service client (Sarvam Vision)
    - Implement `OCRService` class with `extract_text()` method
    - Support document types: GST certificate, PAN card, invoice
    - Handle 23 languages
    - _Requirements: 1.2_
  
  - [ ] 3.4 Create Translation service client (Mayura)
    - Implement `TranslationService` class with `translate()` and `batch_translate()` methods
    - Support context-aware translation for product names
    - _Requirements: 2.2_
  
  - [ ]* 3.5 Write property tests for voice services
    - **Property 5: Code-Mixed Transcription Accuracy**
    - **Property 7: ONDC-Compliant Translation**
    - **Validates: Requirements 1.5, 2.2, 10.5**

- [ ] 4. Implement external API clients
  - [ ] 4.1 Create B2B platform API client
    - Implement `B2BPlatformAPI` interface
    - Create concrete implementations for Udaan and Jumbotail
    - Implement `query_prices()`, `submit_po()`, `track_order()` methods
    - Add retry logic and circuit breaker pattern
    - _Requirements: 4.1, 6.1_
  
  - [ ] 4.2 Create ONDC Seller API client
    - Implement `ONDCSellerAPI` class
    - Implement `update_availability()`, `update_pricing()`, `register_seller()` methods
    - Handle ONDC authentication and request signing
    - _Requirements: 7.1, 8.2_
  
  - [ ] 4.3 Create ONDC Gateway client
    - Implement `ONDCGateway` class for order notifications
    - Implement webhook subscription and order acknowledgment
    - _Requirements: 9.1_
  
  - [ ] 4.4 Create GSTN validation API client
    - Implement `GSTNValidationAPI` class
    - Implement `validate_gstin()` method with real-time validation
    - _Requirements: 1.3_
  
  - [ ]* 4.5 Write property tests for API clients
    - **Property 3: GSTIN Validation Trigger**
    - **Property 13: Multi-Platform Price Aggregation**
    - **Validates: Requirements 1.3, 4.1**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement database layer and caching
  - [ ] 6.1 Set up database schema with SQLAlchemy
    - Create tables for stores, catalog, inventory, transactions, audit logs
    - Implement database migrations with Alembic
    - Add indexes for common queries
    - _Requirements: 1.4, 2.3, 12.5_
  
  - [ ] 6.2 Implement repository pattern for data access
    - Create `StoreRepository`, `CatalogRepository`, `InventoryRepository`
    - Implement CRUD operations with transaction support
    - Add query methods for common access patterns
    - _Requirements: 1.4, 2.3, 5.1_
  
  - [ ] 6.3 Implement offline cache system
    - Create `OfflineCache` class with Redis backend
    - Implement cache invalidation and expiry logic
    - Add pending intent queue for offline operations
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]* 6.4 Write property tests for caching
    - **Property 16: Cached Price Fallback**
    - **Property 37: Offline Query Cache Usage**
    - **Property 38: Intent Caching and Sync**
    - **Validates: Requirements 4.5, 11.1, 11.2, 11.3**

- [ ] 7. Implement Trust Agent
  - [ ] 7.1 Create Trust Agent core logic
    - Implement `TrustAgent` class
    - Implement `validate_po()` method with budget checking
    - Implement `requires_hitl()` method for threshold checking
    - Implement `check_budget()` for daily/weekly/monthly limits
    - _Requirements: 12.1, 12.2_
  
  - [ ] 7.2 Implement voice biometric authentication
    - Implement `authenticate_voice()` method
    - Integrate with voice biometric service
    - Add enrollment and verification flows
    - _Requirements: 6.2, 6.3_
  
  - [ ] 7.3 Implement audit logging
    - Implement `log_transaction()` method
    - Create structured audit log entries
    - Add transaction history queries
    - _Requirements: 12.5_
  
  - [ ]* 7.4 Write property tests for Trust Agent
    - **Property 40: Budget Validation**
    - **Property 41: HITL Trigger on Budget Excess**
    - **Property 43: Business Rule Violation Blocking**
    - **Property 44: Transaction Audit Logging**
    - **Validates: Requirements 12.1, 12.2, 12.4, 12.5**

- [ ] 8. Implement Procurement Agent
  - [ ] 8.1 Create Procurement Agent core logic
    - Implement `ProcurementAgent` class
    - Implement `discover_prices()` method with multi-platform aggregation
    - Implement price comparison and ranking logic
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 8.2 Implement draft PO generation
    - Implement `generate_draft_po()` method
    - Calculate total costs including delivery
    - Apply bundle discounts
    - _Requirements: 5.2, 18.1, 18.2_
  
  - [ ] 8.3 Implement PO execution
    - Implement `execute_po()` method
    - Submit PO to selected B2B platform
    - Handle confirmation and error responses
    - _Requirements: 6.1_
  
  - [ ] 8.4 Implement bundle discount logic
    - Implement `find_bundle_discounts()` method
    - Identify cross-platform bundle opportunities
    - Calculate optimal bundle selection
    - _Requirements: 18.1, 18.3_
  
  - [ ]* 8.5 Write property tests for Procurement Agent
    - **Property 14: Total Cost Calculation**
    - **Property 15: Supplier Ranking by Total Cost**
    - **Property 62: Bundle Discount Identification**
    - **Property 64: Optimal Bundle Selection**
    - **Validates: Requirements 4.2, 4.3, 18.1, 18.3**

- [ ] 9. Implement Inventory Agent
  - [ ] 9.1 Create Inventory Agent core logic
    - Implement `InventoryAgent` class
    - Implement `calculate_reorder_point()` using formula R = (d × L) + SS
    - Implement `update_stock()` and `query_stock()` methods
    - _Requirements: 5.1, 5.2_
  
  - [ ] 9.2 Implement demand forecasting
    - Implement `forecast_demand()` method
    - Integrate historical sales, seasonal trends, weather, festivals
    - Use time-series forecasting (e.g., Prophet or ARIMA)
    - _Requirements: 5.3, 13.1_
  
  - [ ] 9.3 Implement restocking alerts
    - Implement `generate_restock_alert()` method
    - Check stock levels against reorder points
    - Generate draft carts with EOQ quantities
    - _Requirements: 5.1, 5.2_
  
  - [ ] 9.4 Implement shelf space optimization
    - Implement `optimize_shelf_space()` method
    - Use linear programming for product mix optimization
    - Prioritize high-velocity SKUs
    - _Requirements: 13.2, 13.3_
  
  - [ ]* 9.5 Write property tests for Inventory Agent
    - **Property 17: Reorder Point Alert Generation**
    - **Property 18: EOQ-Based Draft Cart Generation**
    - **Property 19: Multi-Factor Demand Forecasting**
    - **Property 46: High-Velocity SKU Prioritization**
    - **Validates: Requirements 5.1, 5.2, 5.3, 13.3**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement ONDC Agent
  - [ ] 11.1 Create ONDC Agent core logic
    - Implement `ONDCAgent` class
    - Implement `register_store()` method with GSTIN validation
    - Implement `validate_gstin()` method
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [ ] 11.2 Implement DigiReady certification
    - Implement `conduct_digiready_assessment()` method
    - Create assessment questionnaire flow
    - Implement auto-certification logic
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 11.3 Implement product taxonomy mapping
    - Implement `map_product_to_taxonomy()` method
    - Create vernacular to ONDC category mapping database
    - Handle ambiguous mappings with confidence scoring
    - _Requirements: 2.1, 2.4_
  
  - [ ] 11.4 Implement inventory synchronization
    - Implement `sync_inventory()` method
    - Update ONDC catalog via Seller APIs
    - Handle sync failures with retry queue
    - _Requirements: 7.1, 7.2, 7.4_
  
  - [ ] 11.5 Implement pricing updates
    - Implement `update_pricing()` method
    - Support percentage and absolute price adjustments
    - Handle time-bound pricing with scheduled reversion
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 11.6 Implement order notification handling
    - Implement `receive_order()` method
    - Parse ONDC order notifications
    - Generate TTS alerts with order details
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 11.7 Write property tests for ONDC Agent
    - **Property 4: Profile Creation on Validation Success**
    - **Property 6: Vernacular to ONDC Taxonomy Mapping**
    - **Property 11: Certification Issuance on Completion**
    - **Property 26: ONDC Inventory Sync Trigger**
    - **Property 30: Price Adjustment Parsing**
    - **Validates: Requirements 1.4, 2.1, 3.2, 7.1, 8.1**

- [ ] 12. Implement Master Orchestrator
  - [ ] 12.1 Create intent parsing system
    - Implement `parse_intent()` method using LLM
    - Define intent types and entity extraction
    - Handle multi-intent utterances
    - _Requirements: 14.1_
  
  - [ ] 12.2 Create execution planning
    - Implement `create_execution_plan()` method
    - Determine required agents and dependencies
    - Support parallel and sequential execution
    - _Requirements: 14.2_
  
  - [ ] 12.3 Implement agent coordination
    - Implement `execute_plan()` method
    - Delegate to specialist agents
    - Aggregate results from multiple agents
    - Handle agent failures with fallbacks
    - _Requirements: 14.2, 14.4_
  
  - [ ] 12.4 Implement context management
    - Implement `SessionContext` management
    - Store conversation history
    - Resolve references to previous items
    - Implement context timeout (5 minutes)
    - _Requirements: 14.5, 19.1, 19.2, 19.3, 19.4_
  
  - [ ] 12.5 Implement response generation
    - Implement `generate_response()` method
    - Create audio summaries via TTS
    - Handle confirmation levels (explicit vs implicit)
    - Generate distinct aural cues for states
    - _Requirements: 14.3, 15.1, 15.2, 15.4_
  
  - [ ]* 12.6 Write property tests for Orchestrator
    - **Property 47: Intent-Based Agent Delegation**
    - **Property 48: Multi-Agent Coordination**
    - **Property 51: Conversation Context Preservation**
    - **Property 54: Confirmation Level Selection**
    - **Validates: Requirements 14.1, 14.2, 14.5, 15.1, 15.2**

- [ ] 13. Implement voice interaction flows
  - [ ] 13.1 Create wake-word detection handler
    - Implement wake-word activation logic
    - Provide audio feedback on activation
    - Support manual activation fallback
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ] 13.2 Implement voice command processing pipeline
    - Wire ASR → Orchestrator → TTS flow
    - Handle low-confidence transcriptions
    - Implement retry logic for unclear input
    - _Requirements: 1.1, 10.4_
  
  - [ ] 13.3 Implement confirmation workflows
    - Create explicit confirmation for high-value transactions
    - Create implicit confirmation for routine updates
    - Handle confirmation rejections
    - _Requirements: 15.1, 15.2, 15.3, 15.5_
  
  - [ ] 13.4 Implement preference management
    - Store and retrieve user preferences (TTS speed, pitch)
    - Apply preferences to TTS output
    - Persist preferences across sessions
    - _Requirements: 16.1, 16.2, 16.4_
  
  - [ ]* 13.5 Write property tests for voice interactions
    - **Property 20: Draft Cart Approval Requirement**
    - **Property 55: Explicit Confirmation Completeness**
    - **Property 57: Confirmation Rejection Handling**
    - **Property 60: Preference Persistence**
    - **Validates: Requirements 5.4, 15.3, 15.5, 16.4**

- [ ] 14. Implement error handling and fallback logic
  - [ ] 14.1 Create error classification system
    - Define error categories (voice, API, business logic, data, system)
    - Implement error severity levels
    - Create error-to-message mappings
    - _Requirements: 16.3_
  
  - [ ] 14.2 Implement retry and circuit breaker patterns
    - Add exponential backoff for transient errors
    - Implement circuit breaker for external APIs
    - Create dead letter queue for failed operations
    - _Requirements: 7.4, 20.5_
  
  - [ ] 14.3 Implement graceful degradation
    - Define degradation levels (full, degraded, offline, emergency)
    - Implement mode switching logic
    - Notify users of current mode
    - _Requirements: 11.1, 11.4, 20.3_
  
  - [ ] 14.4 Create specific error prompts
    - Generate context-specific error messages
    - Provide actionable next steps
    - Avoid generic "I don't understand" messages
    - _Requirements: 16.3_
  
  - [ ]* 14.5 Write property tests for error handling
    - **Property 9: Ambiguous Mapping Clarification**
    - **Property 25: PO Failure Error Explanation**
    - **Property 50: Agent Failure Fallback**
    - **Property 59: Specific Error Prompts**
    - **Validates: Requirements 2.4, 6.5, 14.4, 16.3**

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement complete user workflows
  - [ ] 16.1 Implement onboarding workflow
    - Wire together: voice registration → OCR → GSTIN validation → profile creation → catalog setup → DigiReady certification
    - Add progress tracking and resumption
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 3.2_
  
  - [ ] 16.2 Implement procurement workflow
    - Wire together: price query → comparison → draft cart → approval → authentication → PO submission → confirmation
    - Handle HITL approval flow
    - _Requirements: 4.1, 5.2, 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 16.3 Implement inventory management workflow
    - Wire together: stock update → ONDC sync → confirmation
    - Handle sync failures and retries
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 16.4 Implement order notification workflow
    - Wire together: ONDC order → notification generation → TTS alert → queuing if unavailable
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ]* 16.5 Write integration tests for complete workflows
    - Test end-to-end onboarding flow
    - Test end-to-end procurement flow
    - Test end-to-end inventory sync flow
    - Test order notification flow
    - _Requirements: 1.1, 4.1, 7.1, 9.1_

- [ ] 17. Implement REST API endpoints
  - [ ] 17.1 Create FastAPI application
    - Set up FastAPI app with middleware
    - Add CORS, authentication, rate limiting
    - Implement health check endpoints
    - _Requirements: 20.2, 20.4_
  
  - [ ] 17.2 Create voice interaction endpoints
    - POST `/api/voice/transcribe` - Submit audio for transcription
    - POST `/api/voice/process` - Process voice command end-to-end
    - GET `/api/voice/response/{session_id}` - Get TTS audio response
    - _Requirements: 1.1, 10.1_
  
  - [ ] 17.3 Create store management endpoints
    - POST `/api/stores/register` - Register new store
    - GET `/api/stores/{store_id}` - Get store profile
    - PUT `/api/stores/{store_id}/preferences` - Update preferences
    - _Requirements: 1.1, 16.4_
  
  - [ ] 17.4 Create catalog and inventory endpoints
    - POST `/api/catalog/items` - Add catalog item
    - PUT `/api/inventory/{sku}` - Update stock level
    - GET `/api/inventory/{sku}` - Query stock level
    - _Requirements: 2.1, 7.1_
  
  - [ ] 17.5 Create procurement endpoints
    - POST `/api/procurement/price-query` - Query prices
    - POST `/api/procurement/draft-cart` - Create draft cart
    - POST `/api/procurement/approve` - Approve and execute PO
    - _Requirements: 4.1, 5.2, 6.1_
  
  - [ ] 17.6 Create ONDC webhook endpoints
    - POST `/api/webhooks/ondc/orders` - Receive order notifications
    - POST `/api/webhooks/ondc/status` - Receive status updates
    - _Requirements: 9.1_

- [ ] 18. Implement monitoring and observability
  - [ ] 18.1 Add structured logging
    - Log all agent invocations with context
    - Log all external API calls with latency
    - Log all errors with stack traces
    - _Requirements: 20.4_
  
  - [ ] 18.2 Add metrics collection
    - Track request latency (p50, p95, p99)
    - Track error rates by category
    - Track cache hit rates
    - Track agent execution times
    - _Requirements: 20.1_
  
  - [ ] 18.3 Add alerting rules
    - Alert on high error rates (>5%)
    - Alert on slow responses (>3s)
    - Alert on service downtime
    - Alert on budget violations
    - _Requirements: 20.4_
  
  - [ ] 18.4 Create monitoring dashboard
    - Display real-time metrics
    - Show error trends
    - Show user activity patterns
    - _Requirements: 20.4_

- [ ] 19. Write comprehensive documentation
  - [ ] 19.1 Create API documentation
    - Document all REST endpoints with OpenAPI/Swagger
    - Include request/response examples
    - Document error codes and messages
  
  - [ ] 19.2 Create deployment guide
    - Document infrastructure requirements
    - Provide Docker and Kubernetes configurations
    - Document environment variables and secrets
  
  - [ ] 19.3 Create operator guide
    - Document monitoring and alerting
    - Provide troubleshooting procedures
    - Document backup and recovery procedures

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Run full test suite (unit + property + integration)
  - Verify all correctness properties pass
  - Check test coverage meets requirements (>80% overall, 100% critical paths)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- The implementation uses Python with FastAPI, Pydantic, Hypothesis, and SQLAlchemy
- External services (ASR, TTS, OCR, Translation) are wrapped in client classes for testability
- All external APIs are mocked in tests using contract testing
