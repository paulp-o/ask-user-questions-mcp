# AUQ Web Service Proposal

## Problem Statement

AI agents frequently require human input to proceed with tasks, but users are not always available at their terminal or development environment. This creates friction in workflows where agents need to ask questions and wait for responses, limiting the mobility and responsiveness of AI-assisted development. The current TUI-based approach requires users to be physically present at their machine, which is not always feasible in modern development workflows where users may be mobile, in meetings, or working across multiple devices.

## Goals

- Enable remote answering of AI agent questions via a web-based Progressive Web App (PWA)
- Provide push notifications to alert users when new questions are pending
- Support both native AUQ question format and MCP Elicitation JSON Schema format
- Maintain fully open source codebase with self-hosting capability
- Ensure consistent answering user experience between TUI and web interfaces
- Implement simple API key authentication for agent-to-service communication
- Enable real-time updates using Server-Sent Events (SSE) for browser interface
- Provide polling fallback for push notifications when VAPID is not configured

## Non-Goals for MVP

- Team collaboration features or multi-user question routing
- Complex workspace hierarchies or advanced permission systems
- Native mobile applications (iOS/Android)
- Advanced analytics or question history beyond basic storage
- Integration with external notification services beyond web push
- Support for question branching or conditional logic

## Success Criteria

- Agent successfully sends question set to web service via HTTP API
- User receives push notification on their device within 5 seconds of question creation
- User can access and answer questions via responsive web interface on any device
- Agent receives answers and continues execution without manual intervention
- System gracefully falls back to local TUI mode when web API is unreachable
- Both AUQ native and MCP Elicitation formats work seamlessly
- Self-hosted deployment is straightforward with SQLite database

## Risks

- **Serverless SSE Limitations**: Serverless platforms may have connection timeouts or limitations on long-lived SSE connections, requiring careful implementation and potential fallbacks
- **Push Notification Reliability**: Web push notifications depend on browser support, user permissions, and service worker reliability across different platforms and network conditions
- **Polling Latency**: Agent-side polling every 2-5 seconds introduces latency that may affect real-time feel of interactions
- **Database Scalability**: SQLite may not scale well if question volume exceeds expectations, though acceptable for MVP
- **Auth Security**: Simple API key system may not be sufficient for production security requirements
- **Browser Compatibility**: PWA features and SSE may have varying support across older browsers