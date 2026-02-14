# Requirements Document: Swar-Vani Procurement System

## Introduction

Swar-Vani is an agentic AI system designed to bridge the digital divide for Indian SMEs and kirana stores through vernacular voice interfaces. The system addresses critical challenges faced by 63 million enterprises that contribute 30% to India's GDP, including manual inventory tracking, limited digital tool awareness, and complex English-heavy interfaces. The procurement module enables voice-driven inventory management, multi-platform price discovery, and ONDC marketplace integration.

## Glossary

- **System**: The Swar-Vani Procurement System
- **Store_Owner**: The kirana store or SME operator using the system
- **Orchestrator**: The master agent that receives voice input and delegates to specialist agents
- **Procurement_Agent**: Specialist agent handling B2B platform integration and price discovery
- **Inventory_Agent**: Specialist agent managing stock levels and demand forecasting
- **ONDC_Agent**: Specialist agent handling ONDC onboarding and catalog management
- **Trust_Agent**: Specialist agent enforcing business rules and authentication
- **ASR_Service**: Saaras v3 speech-to-text service
- **TTS_Service**: Bulbul v3 text-to-speech service
- **OCR_Service**: Sarvam Vision optical character recognition service
- **Translation_Service**: Mayura translation service
- **B2B_Platform**: External platforms like Udaan, Jumbotail
- **ONDC_Network**: Open Network for Digital Commerce
- **Voice_Input**: Audio captured from Store_Owner
- **Intent**: Parsed goal from voice input
- **Draft_Cart**: Proposed purchase order awaiting approval
- **PO**: Purchase Order
- **SKU**: Stock Keeping Unit (product item)
- **EOQ**: Economic Order Quantity
- **HITL**: Human-in-the-Loop approval mechanism
- **DigiReady_Certification**: ONDC readiness certification
- **GSTIN**: Goods and Services Tax Identification Number
- **Reorder_Point**: Inventory level triggering restocking (R = d × L + SS)

## Requirements

### Requirement 1: Voice-Driven Store Registration

**User Story:** As a Store_Owner, I want to complete registration using voice in my native language, so that I can onboard without typing or navigating complex forms.

#### Acceptance Criteria

1. WHEN a Store_Owner provides business details via Voice_Input, THE System SHALL extract GSTIN, business name, and contact information
2. WHEN registration documents are captured via camera, THE OCR_Service SHALL extract text from GST certificate and PAN card in 23 languages
3. WHEN GSTIN is extracted, THE System SHALL validate it in real-time via GSTN APIs
4. WHEN validation succeeds, THE System SHALL create a store profile and confirm via TTS_Service
5. WHEN Voice_Input contains code-mixed language, THE ASR_Service SHALL accurately transcribe with translit support

### Requirement 2: Autonomous Catalog Creation

**User Story:** As a Store_Owner, I want to describe my inventory via voice, so that my ONDC store catalog is automatically populated without manual data entry.

#### Acceptance Criteria

1. WHEN a Store_Owner describes products via Voice_Input, THE ONDC_Agent SHALL map vernacular names to ONDC retail taxonomy
2. WHEN vernacular product names are provided, THE Translation_Service SHALL generate ONDC-compliant English descriptors
3. WHEN catalog items are created, THE System SHALL auto-populate with standard product images and descriptions
4. WHEN catalog mapping is ambiguous, THE System SHALL request clarification via TTS_Service
5. THE System SHALL support mapping for at least 50 product categories per store

### Requirement 3: DigiReady Certification Automation

**User Story:** As a Store_Owner, I want to complete ONDC readiness assessment via voice, so that I can obtain DigiReady_Certification without technical assistance.

#### Acceptance Criteria

1. WHEN a Store_Owner initiates certification, THE ONDC_Agent SHALL conduct interactive voice assessment
2. WHEN all assessment criteria are met, THE System SHALL auto-issue DigiReady_Certification
3. WHEN assessment is incomplete, THE System SHALL provide specific guidance via TTS_Service
4. THE System SHALL complete certification process within 48 hours of onboarding initiation

### Requirement 4: Multi-Platform Price Discovery

**User Story:** As a Store_Owner, I want to query prices across multiple B2B platforms via voice, so that I can identify the best procurement deals including delivery costs.

#### Acceptance Criteria

1. WHEN a Store_Owner queries product prices via Voice_Input, THE Procurement_Agent SHALL aggregate real-time prices from all connected B2B_Platforms
2. WHEN price data is retrieved, THE System SHALL factor in delivery costs and present total cost via TTS_Service
3. WHEN multiple suppliers offer the same product, THE System SHALL rank by total cost and delivery time
4. THE Procurement_Agent SHALL complete price discovery within 3 seconds of query
5. WHEN B2B_Platform APIs are unavailable, THE System SHALL use cached pricing data and notify Store_Owner

### Requirement 5: Predictive Restocking Alerts

**User Story:** As a Store_Owner, I want proactive alerts when inventory is likely to run out, so that I can avoid stock-outs without constant monitoring.

#### Acceptance Criteria

1. WHEN current stock reaches Reorder_Point, THE Inventory_Agent SHALL generate restocking alert via TTS_Service
2. WHEN restocking is needed, THE System SHALL auto-generate Draft_Cart based on EOQ calculations
3. WHEN generating Draft_Cart, THE Inventory_Agent SHALL analyze historical sales velocity, seasonal trends, and upcoming festivals
4. WHEN Draft_Cart is created, THE System SHALL present it for voice approval before execution
5. THE Inventory_Agent SHALL reduce stock-out rate to below 3%

### Requirement 6: Voice-Authorized Purchase Orders

**User Story:** As a Store_Owner, I want to authorize purchases via voice confirmation, so that I can complete procurement hands-free while managing my store.

#### Acceptance Criteria

1. WHEN a Store_Owner approves Draft_Cart via Voice_Input, THE System SHALL create and submit PO to selected B2B_Platform
2. WHEN PO value exceeds configured threshold, THE Trust_Agent SHALL require voice biometric authentication
3. WHEN voice biometric authentication is required, THE System SHALL verify Store_Owner identity before PO execution
4. WHEN PO is submitted successfully, THE System SHALL confirm order details and expected delivery via TTS_Service
5. WHEN PO submission fails, THE System SHALL explain the error and suggest alternatives via TTS_Service

### Requirement 7: Real-Time ONDC Inventory Synchronization

**User Story:** As a Store_Owner, I want to update my ONDC catalog via voice, so that my online inventory reflects real-time stock availability.

#### Acceptance Criteria

1. WHEN a Store_Owner reports stock changes via Voice_Input, THE ONDC_Agent SHALL update catalog availability via ONDC Seller APIs within 5 seconds
2. WHEN an SKU is marked unavailable, THE System SHALL prevent new orders for that item on ONDC_Network
3. WHEN inventory sync completes, THE System SHALL provide multimodal confirmation via TTS_Service and phone notification
4. WHEN ONDC APIs are unavailable, THE System SHALL queue updates and retry with exponential backoff

### Requirement 8: Dynamic Voice-Driven Pricing

**User Story:** As a Store_Owner, I want to adjust prices via voice commands, so that I can respond quickly to market conditions and competition.

#### Acceptance Criteria

1. WHEN a Store_Owner requests price changes via Voice_Input, THE ONDC_Agent SHALL parse percentage or absolute price adjustments
2. WHEN price changes are parsed, THE System SHALL update ONDC_Network pricing in real-time
3. WHEN time-bound pricing is specified, THE System SHALL automatically revert prices after the specified duration
4. WHEN price changes are applied, THE System SHALL confirm new prices via TTS_Service

### Requirement 9: Voice-Driven Order Notifications

**User Story:** As a Store_Owner, I want audio alerts for new ONDC orders, so that I can fulfill orders promptly without constantly checking my phone.

#### Acceptance Criteria

1. WHEN a new order is received from ONDC_Network, THE System SHALL generate audio alert via TTS_Service
2. WHEN order notification is played, THE System SHALL include customer details, items, and total amount
3. WHEN Store_Owner is unavailable, THE System SHALL queue notifications and replay on demand
4. THE System SHALL integrate with ONDC Gateway for real-time order relay

### Requirement 10: Vernacular Speech Processing

**User Story:** As a Store_Owner, I want to interact in my native language with code-mixing support, so that I can use the system naturally without language barriers.

#### Acceptance Criteria

1. THE ASR_Service SHALL support speech-to-text for 22 Indian languages with codemix and translit support
2. THE TTS_Service SHALL support text-to-speech for 11 Indian languages with customizable pitch and pace
3. WHEN ambient noise exceeds 75 dB, THE System SHALL effectively process Voice_Input
4. THE System SHALL complete end-to-end ASR and intent processing within 1.5 seconds
5. WHEN Store_Owner uses brand names in English within vernacular speech, THE ASR_Service SHALL accurately transcribe mixed language input

### Requirement 11: Offline Capability

**User Story:** As a Store_Owner, I want basic inventory queries to work offline, so that I can access critical information during network outages.

#### Acceptance Criteria

1. WHEN network connectivity is unavailable, THE System SHALL respond to basic inventory queries using local cache
2. WHEN network connectivity is unavailable, THE System SHALL cache intents for execution when connectivity resumes
3. WHEN connectivity is restored, THE System SHALL sync cached intents and execute pending operations
4. THE System SHALL notify Store_Owner via TTS_Service when operating in offline mode

### Requirement 12: Trust and Budget Governance

**User Story:** As a Store_Owner, I want automated budget enforcement and approval workflows, so that I can prevent unauthorized or excessive spending.

#### Acceptance Criteria

1. WHEN a PO is created, THE Trust_Agent SHALL validate it against configured budget limits
2. WHEN a PO exceeds budget threshold, THE Trust_Agent SHALL trigger HITL approval workflow
3. WHEN HITL approval is required, THE System SHALL notify designated approver via phone and voice
4. WHEN business rules are violated, THE Trust_Agent SHALL block the transaction and explain the reason via TTS_Service
5. THE Trust_Agent SHALL maintain audit log of all transactions and approval decisions

### Requirement 13: Demand Forecasting and Shelf Optimization

**User Story:** As a Store_Owner, I want AI-driven demand predictions, so that I can optimize my limited shelf space for maximum profitability.

#### Acceptance Criteria

1. WHEN analyzing inventory, THE Inventory_Agent SHALL forecast demand using historical sales, seasonal trends, weather data, and festival calendars
2. WHEN shelf space is limited, THE Inventory_Agent SHALL recommend optimal product mix for stores under 500 sq ft
3. WHEN high-velocity SKUs are identified, THE System SHALL prioritize them in restocking recommendations
4. THE Inventory_Agent SHALL improve forecast accuracy by at least 20% over 3 months of operation

### Requirement 14: Multi-Agent Orchestration

**User Story:** As a Store_Owner, I want seamless coordination between different system capabilities, so that complex tasks are handled automatically without my intervention.

#### Acceptance Criteria

1. WHEN Voice_Input is received, THE Orchestrator SHALL parse Intent and delegate to appropriate specialist agents
2. WHEN multiple agents are required, THE Orchestrator SHALL coordinate subtask execution and aggregate results
3. WHEN agent execution completes, THE Orchestrator SHALL generate audio summary via TTS_Service
4. WHEN agent execution fails, THE Orchestrator SHALL implement fallback strategies and notify Store_Owner
5. THE Orchestrator SHALL maintain conversation context across multi-turn interactions

### Requirement 15: Explicit and Implicit Confirmation Patterns

**User Story:** As a Store_Owner, I want appropriate confirmation levels for different actions, so that I have control over critical decisions while routine tasks remain efficient.

#### Acceptance Criteria

1. WHEN executing high-value transactions, THE System SHALL use explicit confirmation with full details via TTS_Service
2. WHEN executing routine updates, THE System SHALL use implicit confirmation with brief acknowledgment
3. WHEN confirmation is requested, THE System SHALL include transaction amount, items, and supplier details
4. THE System SHALL provide distinct aural cues for listening state, success, and error conditions
5. WHEN Store_Owner rejects a confirmation, THE System SHALL cancel the operation and ask for clarification

### Requirement 16: Adjustable Response Speed and Accessibility

**User Story:** As a Store_Owner, I want to control how fast the system speaks, so that I can understand responses clearly regardless of my familiarity with technology.

#### Acceptance Criteria

1. THE System SHALL support adjustable TTS_Service response speed from 0.75x to 1.5x
2. WHEN Store_Owner requests speed adjustment via Voice_Input, THE System SHALL apply changes immediately
3. WHEN errors occur, THE System SHALL provide specific fallback prompts instead of generic "I don't understand" messages
4. THE System SHALL remember Store_Owner preferences across sessions

### Requirement 17: Wake-Word Activation

**User Story:** As a Store_Owner, I want to activate the system hands-free using a wake word, so that I can interact while serving customers or handling inventory.

#### Acceptance Criteria

1. THE System SHALL support multilingual wake-word detection for phrases like "Suno Swar-Vani"
2. WHEN wake-word is detected, THE System SHALL activate listening mode and provide audio feedback
3. WHEN wake-word detection fails, THE System SHALL support manual activation via button press
4. THE System SHALL minimize false wake-word activations to less than 1 per hour

### Requirement 18: Bundle Negotiation and Procurement Optimization

**User Story:** As a Store_Owner, I want the system to negotiate bundle discounts automatically, so that I can reduce procurement costs without manual bargaining.

#### Acceptance Criteria

1. WHEN creating Draft_Cart with multiple items, THE Procurement_Agent SHALL identify bundle discount opportunities across B2B_Platforms
2. WHEN bundle discounts are available, THE System SHALL automatically apply them and present savings via TTS_Service
3. WHEN multiple bundle options exist, THE Procurement_Agent SHALL recommend the option with lowest total cost
4. THE Procurement_Agent SHALL achieve 5-9% reduction in procurement costs through price discovery and bundle optimization

### Requirement 19: Context Memory and Conversation Continuity

**User Story:** As a Store_Owner, I want the system to remember our conversation context, so that I can have natural multi-turn interactions without repeating information.

#### Acceptance Criteria

1. WHEN Store_Owner refers to previous items in conversation, THE Orchestrator SHALL resolve references using context memory
2. WHEN multi-turn interactions occur, THE System SHALL maintain state across turns
3. WHEN conversation is interrupted, THE System SHALL resume from the last confirmed state
4. THE System SHALL retain conversation context for at least 5 minutes of inactivity

### Requirement 20: Performance and Scalability

**User Story:** As a Store_Owner, I want fast and reliable system responses, so that I can efficiently manage my store during peak business hours.

#### Acceptance Criteria

1. THE System SHALL process Voice_Input with end-to-end latency below 1.5 seconds for 95% of requests
2. THE System SHALL support concurrent usage by at least 10,000 Store_Owners
3. WHEN system load is high, THE System SHALL maintain response quality through graceful degradation
4. THE System SHALL achieve 99.5% uptime during business hours (6 AM to 10 PM IST)
5. WHEN external APIs fail, THE System SHALL use cached data and fallback mechanisms to maintain functionality
