# FlowChart - Google Ads API Design Documentation

## 1. Tool Overview
**Tool Name:** FlowChart
**Description:** FlowChart is a centralized SaaS platform designed for digital marketing agencies and brands to monitor their marketing performance. 
**Objective:** The primary goal of our integration with the Google Ads API is to retrieve read-only performance metrics (impressions, clicks, conversions, spend) from our users' own Google Ads accounts and display them in internal dashboards within our platform.

## 2. Target Audience
Our tool is intended for external users (digital marketing agencies and business owners) who want to connect their own Google Ads accounts to view their performance alongside other marketing channels (like Google Analytics 4) in a unified dashboard.

## 3. Architecture & Data Flow
1. **Authentication:** We use standard OAuth 2.0 Web Server Flow. Users authenticate via the Google Consent screen and grant the `adwords` scope.
2. **Token Storage:** Access tokens and refresh tokens are securely encrypted and stored in our database, associated with the user's private workspace.
3. **API Calls:** Our backend server (Node.js/Next.js) makes server-to-server requests to the Google Ads API (`https://googleads.googleapis.com/v16/customers/{customer_id}/googleAds:searchStream`).
4. **Data Retrieval:** We only execute read-only queries (e.g., `SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign`).
5. **Data Display:** The retrieved JSON data is parsed and displayed on the user's private frontend dashboard in the form of charts and tables.
6. **Data Privacy:** Data is strictly segregated per workspace. We do not share, sell, or aggregate data across different users or third parties.

## 4. Google Ads API Endpoints Used
- `GoogleAdsService.SearchStream` (for reporting and metrics)
- `CustomerService.ListAccessibleCustomers` (to allow users to select which account to link)

## 5. Automation & Creation Features
**None.** 
FlowChart is strictly a reporting and visualization tool. We do not use the API to automate campaign creation, manage bids, modify budgets, or delete any resources.

## 6. Token Usage
Our Developer Token is used exclusively within our proprietary software (FlowChart). We do not share our token with third-party tools or external developers.
