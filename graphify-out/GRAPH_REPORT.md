# Graph Report - .  (2026-08-11)

## Corpus Check
- Large corpus: 811 files · ~1,725,189 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4131 nodes · 11854 edges · 213 communities (164 shown, 49 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 1263 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Playwright Trace Viewer
- API Route Handlers (Briefs/Core)
- POST Endpoints (Webhook/Cron)
- Playwright Minified Assets A
- Playwright Minified Assets B
- OAuth / Meta Integration
- Playwright Minified Assets C
- Channels / Analytics / Store
- AI Catalog & Models
- Ads Manager UI
- GET API Routes
- Alerts Engine
- Playwright Minified Assets D
- Account Selector / Ad Accounts
- Playwright Service Worker
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 157
- Community 158
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 182
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 207

## God Nodes (most connected - your core abstractions)
1. `i()` - 179 edges
2. `n()` - 169 edges
3. `r()` - 153 edges
4. `Logger` - 140 edges
5. `t()` - 136 edges
6. `a()` - 116 edges
7. `o()` - 77 edges
8. `s()` - 75 edges
9. `metaFetch()` - 71 edges
10. `validateBody()` - 71 edges

## Surprising Connections (you probably didn't know these)
- `EditableGrid()` --indirect_call--> `f()`  [INFERRED]
  app/dashboard/briefing/page.tsx → playwright-report/trace/assets/urlMatch-L3liM589.js
- `WebhookRow()` --indirect_call--> `d()`  [INFERRED]
  components/publisher/IntegrationsPanel.tsx → playwright-report/trace/assets/urlMatch-L3liM589.js
- `walk()` --indirect_call--> `f()`  [INFERRED]
  scripts/remove-glass.mjs → playwright-report/trace/assets/urlMatch-L3liM589.js
- `walk()` --indirect_call--> `f()`  [INFERRED]
  scripts/remove-rgba.mjs → playwright-report/trace/assets/urlMatch-L3liM589.js
- `GET()` --indirect_call--> `syncIntegrationAssetsWorkflow()`  [INFERRED]
  app/api/connect/callback/route.ts → workflows/sync-integration-assets.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Security Core** — MultiTenant_Architecture, ADR_001_OAuth_ConfigId, EncryptionAES256, MetaOAuth_Flow [0.95]
- **Knowledge Graph System** — GraphifySkill, ObsidianVault, GraphifyIntegration [0.9]

## Communities (213 total, 49 thin omitted)

### Community 0 - "Playwright Trace Viewer"
Cohesion: 0.02
Nodes (185): _actionInProgress(), addElementHighlight(), addHighlight(), addMaskedElements(), addUserOverlay(), appendChild(), ar(), ariaSnapshot() (+177 more)

### Community 1 - "API Route Handlers (Briefs/Core)"
Cohesion: 0.02
Nodes (147): DELETE, GET, PATCH, PatchBriefSchema, CreateBriefSchema, dynamic, GET, POST (+139 more)

### Community 2 - "POST Endpoints (Webhook/Cron)"
Cohesion: 0.04
Nodes (103): maxDuration, POST(), POST, GET(), POST, GET, backfillThread(), dynamic (+95 more)

### Community 3 - "Playwright Minified Assets A"
Cohesion: 0.08
Nodes (114): T, C(), D(), en(), es(), M(), ns(), nt() (+106 more)

### Community 4 - "Playwright Minified Assets B"
Cohesion: 0.06
Nodes (98): A(), aa(), af(), Ao(), as(), bc(), bi(), ca() (+90 more)

### Community 5 - "OAuth / Meta Integration"
Cohesion: 0.04
Nodes (67): GET(), handleInstagramDirectCallback(), connectSchema, DELETE, directTokenSchema, embeddedSignupSchema, POST, GET() (+59 more)

### Community 6 - "Playwright Minified Assets C"
Cohesion: 0.07
Nodes (84): ac(), add(), addIn(), Au(), ba(), Bo(), clone(), createNode() (+76 more)

### Community 7 - "Channels / Analytics / Store"
Cohesion: 0.06
Nodes (65): ChannelSchema, GET, MetricsSchema, MmmStore, PUT, PutConfigSchema, RowSchema, AdstockDecayChart() (+57 more)

### Community 8 - "AI Catalog & Models"
Cohesion: 0.05
Nodes (45): AI_CATALOG, CatalogModel, CatalogProvider, DEFAULT_MODEL, AnthropicBlock, anthropicProvider, AnthropicResponse, buildPayload() (+37 more)

### Community 9 - "Ads Manager UI"
Cohesion: 0.04
Nodes (45): ALL_COLUMNS, DEFAULT_COLUMNS, BREAKDOWNS, BreakdownSelector(), BreakdownSelectorProps, BulkActionBar(), BulkActionBarProps, BulkBudgetModal() (+37 more)

### Community 10 - "GET API Routes"
Cohesion: 0.05
Nodes (37): GET, dynamic, GET, dynamic, GET, maxDuration, GET, IntegrationCredentials (+29 more)

### Community 11 - "Alerts Engine"
Cohesion: 0.06
Nodes (47): AlertCandidate, AlertContext, AlertSeverity, AlertThresholds, AlertType, DEFAULT_ALERT_THRESHOLDS, evaluateAlerts(), evaluateAndPersistAlerts() (+39 more)

### Community 12 - "Playwright Minified Assets D"
Cohesion: 0.16
Nodes (55): Ae(), at(), B(), be(), Ce(), ct(), De(), Do() (+47 more)

### Community 13 - "Account Selector / Ad Accounts"
Cohesion: 0.06
Nodes (41): AccountSelector(), AccountSelectorProps, AdAccount, fmtSpend(), BREADCRUMB_MAP, ClientMainWrapper(), ICON_MAP, TRANSLATIONS (+33 more)

### Community 14 - "Playwright Service Worker"
Cohesion: 0.05
Nodes (29): actions(), addFrameSnapshot(), addResource(), _appendEvent(), appendTrace(), _ensureResourcesForContext(), fromBits(), getRandomValues() (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (42): createAlert(), findProjectsForEvent(), getAlertLink(), notifyWorkspaceFallback(), persistMetaDm(), POST(), processWebhookEvents(), resolveOwningWorkspaceIds() (+34 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (33): AdsAccount, GoogleAdsPage(), TRANSLATIONS, GA4Property, GoogleAnalyticsPage(), TRANSLATIONS, IntegrationsPage(), PROVIDER_LABELS (+25 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (49): _activelyFocused(), begin(), blurNode(), _cached(), _callMatches(), _callQuery(), checkDeprecatedSelectorUsage(), _checkElementIsStable() (+41 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (41): Bn(), ca(), ci(), cn(), dn(), Dr(), fn(), fs() (+33 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (29): instrumentSerif, inter, jbMono, metadata, orbitron, sora, spaceGrotesk, viewport (+21 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (29): DELETE, GET, PUT, updatePostSchema, GET, POST, maxDuration, POST (+21 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (31): CalendarView(), CalendarViewProps, addDays(), GanttView(), KanbanBoard(), KanbanBoardProps, sla(), SortableKanbanCard() (+23 more)

### Community 22 - "Community 22"
Cohesion: 0.05
Nodes (20): metadata, AuthProviders, LoginPage(), STRINGS, AD_CARDS, AD_PLATFORM_LABEL, HERO_SLIDES, Home() (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (37): deregisterSchema, POST, DELETE, GET, linkSchema, POST, unlinkSchema, baseWrapper() (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.05
Nodes (25): GET, PATCH, PATCH, updateSchema, DELETE, GET, POST, GET (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (32): GET, insightsQuerySchema, GET(), POST(), GET, POST, GET, POST (+24 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (31): useInboxData(), useInboxFilters(), Avatar(), ChatView(), ContactProfile(), PageSelector(), PostView(), ConversationRow() (+23 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (43): A(), aa(), ac(), an(), ao(), bt(), cc(), co() (+35 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (31): dynamic, GET(), maxDuration, dynamic, GET(), maxDuration, GET(), CLIENT_FACTORIES (+23 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (39): ba(), Bs(), cs(), dt(), ea(), ec(), ei(), fe() (+31 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (40): N(), Al(), bl(), Cl(), deepEventTarget(), dl(), el(), _errorDescriptorsFromActions() (+32 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (40): am(), _applyAttribute(), _assert(), atIndentedComment(), blockMap(), blockScalar(), blockSequence(), cm() (+32 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (28): GET(), ChangePasswordSchema, POST, ForgotPasswordSchema, POST(), POST(), RegisterSchema, POST() (+20 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (24): Banner, CHAR_LIMITS, Composer(), MetaPage, PublishTarget, UploadedMedia, ConnectedMetaBadge(), FirstCommentExpander() (+16 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (24): AdCreativeData, AdPreview(), AdPreviewProps, CTA_LABELS, PreviewFormat, CTA_OPTIONS, EditAdModal(), EditAdModalProps (+16 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (27): AIAnalysis, AIAnalysisPanel(), AIAnalysisPanelProps, analyzeLocally(), useAlerts(), breakEvenROAS(), calcAddToCart(), calcCostPerATC() (+19 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (38): ai(), as(), bi(), di(), ds(), G(), ii(), is() (+30 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (35): bcryptjs, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @google-analytics/data, lucide-react, next, next-themes (+27 more)

### Community 38 - "Community 38"
Cohesion: 0.06
Nodes (35): dotenv, eslint, eslint-config-next, devDependencies, dotenv, eslint, eslint-config-next, @playwright/test (+27 more)

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (25): ChannelConfig, CHART_COLORS, CPR_MAP, findResultAction(), fmtMXN(), fmtMXN0(), fmtNum(), getBudgetBreakdown() (+17 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (25): CreateTaskSchema, dynamic, GET, POST, GET, PUT, OpsPage(), canViewSensitive() (+17 more)

### Community 41 - "Community 41"
Cohesion: 0.06
Nodes (31): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+23 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (24): dynamic, GET, FEATURE_LABELS, MeterRowProps, PlanLimitBanner(), PlanLimitBannerProps, PlanUsageMeter(), PlanUsageMeterProps (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (25): CustomCrmModal(), CustomCrmModalProps, ALL_CHANNELS, ChannelDef, getTranslatedChannelDesc(), IntegrationData, IntegrationsView(), ConnectedMetaBadgeProps (+17 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (19): EMPTY_PROJECT, fetchProjectsFromAPI(), FetchResult, MetaPage, ProyectosContent(), ConnectPlatformDropdown(), MetaPage, ProjectModal() (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.10
Nodes (15): TODO: Fetch ad analytics from LinkedIn Marketing API., TODO: Implement after creating LinkedIn Marketing Developer Platform app., TODO: Fetch ad analytics from Pinterest API v5., TODO: Implement after creating Pinterest developer app., TODO: Fetch ad stats from Snapchat Marketing API., TODO: Implement after creating Snapchat Business app., TODO: Fetch ad insights from TikTok Marketing API., TODO: Implement all methods after creating the TikTok developer app. (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (9): DataHub(), PredictiveStudio(), PublicProject, Orbi(), OrbiProps, OrbiState, STATE_COLORS, PageHeader() (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.08
Nodes (6): ye(), collectTestIds(), fileNames(), R(), sortAndPropagateStatus(), te()

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (18): dynamic, GET, dynamic, GET(), dynamic, POST, SwitchSchema, ACTIVE_WORKSPACE_COOKIE (+10 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (17): FacebookPagesPage(), FbPage, TRANSLATIONS, InstagramIntegrationPage(), StatusData, AdAccount, MetaAdsPage(), TRANSLATIONS (+9 more)

### Community 50 - "Community 50"
Cohesion: 0.10
Nodes (22): AlertasGastoProps, AlertasGastoWidget(), BudgetCardsProps, BudgetCardsWidget(), labelStyle, headingStyle, HeatmapWidget(), HeatmapWidgetProps (+14 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (28): ap(), bp(), ci(), cp(), di(), dp(), gp(), hp() (+20 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (23): AdsManagerTable(), AdsManagerTableProps, BID_LABELS, findConversationsValue(), fmt$(), fmtDec(), fmtNum(), fmtPct() (+15 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (27): ar(), br(), cr(), er(), fi(), gi(), hr(), ir() (+19 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (27): an(), b(), c(), closestScreenshot(), cn(), constructor(), dn(), en() (+19 more)

### Community 55 - "Community 55"
Cohesion: 0.26
Nodes (24): atLineEnd(), charAt(), continueScalar(), getLine(), hasChars(), lex(), parseBlockScalar(), parseBlockScalarHeader() (+16 more)

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (20): buildBaseline(), NEGATIVE_HINTS, POSITIVE_HINTS, predictBaseline(), baseColumn(), featureImportance(), leadTopFactors(), priorityFor() (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (14): fmtMXN(), fmtMXN0(), ProjectCard(), ResumenData, ResumenPage(), AuthProvider(), InsightsPreloader(), CachedInsights (+6 more)

### Community 58 - "Community 58"
Cohesion: 0.11
Nodes (15): DEFAULT_PREFS, inp, Prefs, SectionKey, SETTINGS_GROUPS, BrandingManager(), ClientPortalsManager(), Project (+7 more)

### Community 59 - "Community 59"
Cohesion: 0.09
Nodes (21): name, private, scripts, build, db:generate, db:migrate, db:push, db:reencrypt (+13 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (22): _a(), ba(), Ca(), ga(), get(), ha(), hasEntry(), re() (+14 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (21): aa(), ea(), getData(), getEntries(), getEntriesGenerator(), gt(), i(), ia() (+13 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (16): CreateReportSchema, GET, isoDate, POST, fmtDate(), fmtMXN(), fmtMXN0(), PublicReportPage() (+8 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (16): AdsManagerContent(), AlertsToasts(), fmtDate(), ReportesPage(), ReportItem, ClipboardModal(), ClipboardModalProps, icons (+8 more)

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (16): BoostModal(), BoostModalProps, BoostResult, BUDGET_PRESETS, Post, PRESET_COUNTRIES, CHANNEL_ICON, DOW (+8 more)

### Community 65 - "Community 65"
Cohesion: 0.13
Nodes (16): Board, BoardColumn, parseColumnQuery(), platformColors, PostDetailModal(), relativeTime(), serializeColumnQuery(), STREAM_TYPES (+8 more)

### Community 66 - "Community 66"
Cohesion: 0.16
Nodes (15): generateContentGridClient(), BriefingPage(), DAYS_IN_MONTH, EditableGrid(), FOCUS_OPTIONS, FORMAT_OPTIONS, INBOUND_STAGES, MONTH_OPTIONS (+7 more)

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (14): AgentRow, AggConversation, aggregateAgents(), aggregateOperations(), aggregateServices(), avg(), buildTrends(), CampaignRow (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (12): ChartWidgetProps, CtrCpcChartWidget(), InversionChartWidget(), BudgetPacingChart(), BudgetPacingChartProps, CHART_PALETTE, ChartTheme(), CustomTooltip() (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (15): AreasManager(), COLORS, ghostBtn, Member, STATUS_COLORS, uid(), PERM_KEYS, PermissionsManager() (+7 more)

### Community 70 - "Community 70"
Cohesion: 0.20
Nodes (14): predictProbaLogReg(), sigmoid(), trainLogReg(), TrainOpts, bestThreshold(), computeAuc(), computeMetrics(), computePriorityCuts() (+6 more)

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (12): Actor, areaHealth, AreaId, AreaMember, CHAIN_TEMPLATES, ChainStep, ChainTemplate, HEALTH_COLOR (+4 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (11): DAYS_EN, DAYS_ES, formatDate(), formatNum(), ListeningDashboard(), PLATFORM_COLORS, PostCard(), relativeTime() (+3 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (14): evaluateConfiguredFunnel(), FunnelConditionType, FunnelConversation, FunnelMessage, FunnelStepDef, FunnelStepResult, lc(), matchStep() (+6 more)

### Community 74 - "Community 74"
Cohesion: 0.21
Nodes (17): fr(), Ar(), Be(), Dr(), Fr(), Gr(), ht(), init() (+9 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (16): vn(), ch(), cn(), Ft(), ga(), gm(), Hf(), jm() (+8 more)

### Community 76 - "Community 76"
Cohesion: 0.15
Nodes (17): _block(), calculate(), concat(), _crypt(), decrypt(), digest(), encrypt(), _f() (+9 more)

### Community 77 - "Community 77"
Cohesion: 0.15
Nodes (14): BreakdownTab, CampaignDrawer(), CampaignDrawerProps, ChartMetric, fmt$(), fmtNum(), fmtPct(), FILTER_GROUPS (+6 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (14): DATE_PRESETS, DateRangePicker(), DateRangePickerProps, DAY_LABELS, fmt(), fmtDisplay(), getDaysInMonth(), getFirstDayOfWeekMondayBased() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (15): detectTarget(), extractTarget(), inferType(), isBinaryColumn(), isBooleanToken(), isDateToken(), NEGATIVE_TOKENS, NULL_TOKENS (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.23
Nodes (15): ALLOWED_EXTENSIONS, collectApiRoutes(), __dirname, EXCLUDED_DIRS, generateApiIndex(), GENERATED_HEADER(), generateEntitiesIndex(), generateModulesIndex() (+7 more)

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (12): dynamic, GET, POST, ScopeSchema, CANDIDATE_DELIMITERS, decodeBytes(), dedupeHeaders(), parseCsv() (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.19
Nodes (10): DashboardGrid(), DashboardGridProps, MARGIN, WidgetDefinition, DashboardWidget, DashboardWidgetProps, DashboardLayoutState, mergeWithDefaults() (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.20
Nodes (15): bt(), df(), ef(), fl(), from(), gf(), If(), jf() (+7 more)

### Community 84 - "Community 84"
Cohesion: 0.18
Nodes (14): append(), bn(), close(), gn(), hn(), Jn(), Kn(), _n() (+6 more)

### Community 85 - "Community 85"
Cohesion: 0.26
Nodes (11): AdEntity, AdsExecutiveSummary(), AdsExecutiveSummaryProps, formatCompact(), formatMoney(), getStatus(), getWarnings(), InsightBag (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.19
Nodes (9): GoogleHubCenter(), GOOGLE_BASE_SCOPES, GOOGLE_MODULES, GoogleCapability, GoogleModule, GoogleModuleId, GoogleResourceType, isModuleConnected() (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.18
Nodes (10): WidgetBuilderModal(), WidgetBuilderModalProps, WidgetType, DynamicChartConfig, DynamicChartProps, DynamicChartSeries, DynamicComposedChartWidget(), DynamicKpiCardWidget() (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.21
Nodes (13): _addChild(), allTests(), constructor(), _createReporter(), _defaultDescribeItem(), entries(), _fileItem(), filterTree() (+5 more)

### Community 89 - "Community 89"
Cohesion: 0.21
Nodes (10): dynamic, GET, PUT, UpdateStatusSchema, PermissionGuard(), PermissionsContext, PermissionsContextValue, usePermissions() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.20
Nodes (9): META_MODULES, ModuleStatus, WebhookRow(), loadFbSdk(), Project, WaLine, WaStatus, WhatsAppConnectCard() (+1 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (12): dispatch(), F(), _handleOnError(), _onAttach(), _onBegin(), _onEnd(), _onError(), _onExit() (+4 more)

### Community 92 - "Community 92"
Cohesion: 0.40
Nodes (10): isNullToken(), binIndex(), boolToNum(), buildWoe(), numericValue(), predictProbaWoe(), quantileEdges(), toMs() (+2 more)

### Community 93 - "Community 93"
Cohesion: 0.18
Nodes (10): CategoricalTransform, DateTransform, FeatureColumnSpec, ModelKind, NumericTransform, Priority, ScoredRecord, WoeBin (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.31
Nodes (9): ACTIONS, Condition, FREQUENCIES, METRICS, MONETARY_METRICS, OPERATORS, RulesBuilderModal(), RulesBuilderModalProps (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.44
Nodes (9): boolOrNum(), boolToNum(), buildFeatureArtifact(), meanStd(), median(), toMs(), toNumber(), transformAll() (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (8): buildScopeString(), getRequiredScopes(), LEGACY_META_REQUIRED, MODULE_SCOPE_MAP, SCOPE_ALIASES, scopeGranted(), validateModulePermissions(), DEPRECATED

### Community 97 - "Community 97"
Cohesion: 0.22
Nodes (10): $e(), h(), inflateEnd(), ke(), r(), read_byte(), resourceByUrl(), serveResource() (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.27
Nodes (10): _absoluteAnnotationLocationsInplace(), _absoluteLocation(), _addSuite(), _addTest(), _mergeSuiteInto(), _mergeTestInto(), _onStepBegin(), _onTestEnd() (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.28
Nodes (9): ADR-001: Multi config_id Meta OAuth, Design System, Token Encryption AES-256-GCM, FlowChart, Google Ads Integration (GAQL), Meta OAuth Integration Flow, Multi-Tenant Architecture, Technology Stack (+1 more)

### Community 100 - "Community 100"
Cohesion: 0.28
Nodes (3): ChartPanelProps, Skeleton(), SkeletonProps

### Community 101 - "Community 101"
Cohesion: 0.28
Nodes (8): Campaign, CreateAdSetModal(), inp, lbl, NEEDS_PAGE, NEEDS_PIXEL, OBJ_LABELS, Props

### Community 102 - "Community 102"
Cohesion: 0.22
Nodes (6): CPR_MAP, GastoCurvaProps, GastoCurvaWidget(), GastoSpendTableInline(), GastoTableProps, tooltipStyle

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (6): ALL_POSITIONS, approverOf(), EXPANSION_POSITIONS, Position, POSITIONS, Seniority

### Community 104 - "Community 104"
Cohesion: 0.67
Nodes (9): generateLocator(), kn(), quote(), regexToSourceString(), regexToString(), toCallWithExact(), toHasNotText(), toHasText() (+1 more)

### Community 105 - "Community 105"
Cohesion: 0.39
Nodes (8): BLOCKED_COMMANDS, BROWSER_ALLOWLIST, BROWSER_DENYLIST, evaluateBrowserCall(), extractUrls(), isAllowed(), isDenied(), main()

### Community 106 - "Community 106"
Cohesion: 0.22
Nodes (6): DATA_READING_IMPORTS, ModuleInfo, REGISTRY_PATH, registryContent, RESOURCE_LISTING_ROUTES, ROOT

### Community 107 - "Community 107"
Cohesion: 0.32
Nodes (6): CreateWorkspaceSchema, dynamic, GET, POST, generateSlug(), generateUniqueSlug()

### Community 108 - "Community 108"
Cohesion: 0.32
Nodes (4): DeploymentHistoryPage(), fmtDate(), Post, relTime()

### Community 109 - "Community 109"
Cohesion: 0.25
Nodes (7): BIDS, CreateCampaignModal(), inp, lbl, OBJECTIVES, Props, SPECIAL

### Community 110 - "Community 110"
Cohesion: 0.36
Nodes (7): fmtMXN(), fmtNum(), GENDER_LABELS, LABEL_COLORS, pct(), ReliabilityModuleProps, UserReliabilityModule()

### Community 111 - "Community 111"
Cohesion: 0.39
Nodes (7): fmtCurrency(), parseBudget(), ProjectCard(), ProjectCardProps, getPlatformIcon(), PLATFORMS, Project

### Community 112 - "Community 112"
Cohesion: 0.25
Nodes (4): AdCreative, CarouselItem, CreativeCard(), CreativeLightbox()

### Community 113 - "Community 113"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 114 - "Community 114"
Cohesion: 0.29
Nodes (6): DataQualityIssueResult, DataQualitySummary, DqConversation, DqSeverity, findDataQualityIssues(), KNOWN_CHANNELS

### Community 115 - "Community 115"
Cohesion: 0.46
Nodes (6): mulberry32(), seededRng(), shuffledIndices(), xmur3(), Split, stratifiedSplit()

### Community 116 - "Community 116"
Cohesion: 0.25
Nodes (6): ALLOWED_FILES, EXTENSIONS, IGNORE_DIRS, ROOT, SCAN_DIRS, VERSION_PATTERNS

### Community 119 - "Community 119"
Cohesion: 0.38
Nodes (6): fmtMetric(), Project, TRAFFIC_METRICS, TrafficAnalytics(), TrafficResponse, TrafficSummary

### Community 120 - "Community 120"
Cohesion: 0.29
Nodes (6): dest, destFile, __dirname, root, src, srcFile

### Community 121 - "Community 121"
Cohesion: 0.38
Nodes (5): baseWrapper(), getInviteEmailHtmlHandlebars(), getPasswordResetEmailHtmlHandlebars(), headers, templates

### Community 122 - "Community 122"
Cohesion: 0.33
Nodes (5): headers, main(), passwordResetHtml, updateTemplate(), workspaceInviteHtml

### Community 123 - "Community 123"
Cohesion: 0.29
Nodes (4): EXTENSIONS, IGNORE_DIRS, ROOT, SCAN_DIRS

### Community 124 - "Community 124"
Cohesion: 0.29
Nodes (5): EXTENSIONS, IGNORE_DIRS, PATTERNS, ROOT, SCAN_DIRS

### Community 126 - "Community 126"
Cohesion: 0.40
Nodes (4): AlertsCenterProps, LEVEL_CONFIG, Alert, AlertLevel

### Community 127 - "Community 127"
Cohesion: 0.33
Nodes (4): ActiveSection, GoogleSources, GoogleSourcesPanel(), GoogleSourcesPanelProps

### Community 128 - "Community 128"
Cohesion: 0.53
Nodes (4): cleanE2E(), IDS, main(), seedTenant()

### Community 130 - "Community 130"
Cohesion: 0.53
Nodes (4): analyzeFatigue(), FatigueAnalysis, getFatigueDisplay(), quickFatigueCheck()

### Community 131 - "Community 131"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, NOTE: accessToken intentionally NOT exposed in Session., Session

### Community 132 - "Community 132"
Cohesion: 0.40
Nodes (3): COLOR_MAP, KpiCard(), KpiCardProps

### Community 133 - "Community 133"
Cohesion: 0.40
Nodes (5): _absolutePath(), N(), _onProject(), _parseProject(), project()

### Community 134 - "Community 134"
Cohesion: 0.40
Nodes (3): dbUrlLine, envContent, pool

### Community 135 - "Community 135"
Cohesion: 0.40
Nodes (3): apiDir, files, ROOT

### Community 136 - "Community 136"
Cohesion: 0.40
Nodes (4): ChannelConfig, Project, ProjectsState, useProjectsStore

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (4): ApiEnvelope, PublisherPost, PublisherStore, usePublisherStore

### Community 139 - "Community 139"
Cohesion: 0.40
Nodes (3): IGNORE_DIRS, ROOT, SCAN_DIRS

### Community 140 - "Community 140"
Cohesion: 0.40
Nodes (4): PROTECTED_ROUTES, PUBLIC_ROUTES, ROOT, TENANTS

### Community 141 - "Community 141"
Cohesion: 0.50
Nodes (4): Agent Rules (.agents/), CI/CD GitHub Actions, Deploy Flow (Git → Vercel), Runbook FlowChart

### Community 146 - "Community 146"
Cohesion: 0.50
Nodes (3): iad1, crons, regions

### Community 151 - "Community 151"
Cohesion: 0.50
Nodes (3): FbAuthResponse, FbLoginResponse, Window

### Community 152 - "Community 152"
Cohesion: 0.67
Nodes (3): Graphify + Obsidian Integration, Graphify Knowledge Graph Skill, Obsidian Vault (docs/)

### Community 164 - "Community 164"
Cohesion: 0.67
Nodes (3): _createTestResult(), _onTestBegin(), setStartTimeNumber()

### Community 165 - "Community 165"
Cohesion: 0.67
Nodes (3): I(), _onConfigure(), _parseConfig()

## Knowledge Gaps
- **984 isolated node(s):** `$schema`, `hooks`, `maxDuration`, `dynamic`, `ChangePasswordSchema` (+979 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `Community 30` to `Playwright Trace Viewer`, `Playwright Minified Assets A`, `Playwright Minified Assets B`, `Playwright Minified Assets C`, `Ads Manager UI`, `Playwright Minified Assets D`, `Playwright Service Worker`, `Community 17`, `Community 18`, `Community 21`, `Community 27`, `Community 29`, `Community 36`, `Community 39`, `Community 47`, `Community 51`, `Community 53`, `Community 54`, `Community 57`, `Community 70`, `Community 75`, `Community 83`, `Community 88`, `Community 97`, `Community 104`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `bestThreshold()` connect `Community 70` to `Community 56`, `Community 30`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `OpsPage()` connect `Community 40` to `Playwright Minified Assets A`, `Community 16`, `Community 21`, `Community 158`, `Community 63`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 82 inferred relationships involving `i()` (e.g. with `A()` and `br()`) actually correct?**
  _`i()` has 82 INFERRED edges - model-reasoned connections that need verification._
- **Are the 115 inferred relationships involving `n()` (e.g. with `Bs()` and `e()`) actually correct?**
  _`n()` has 115 INFERRED edges - model-reasoned connections that need verification._
- **Are the 110 inferred relationships involving `r()` (e.g. with `A()` and `Bs()`) actually correct?**
  _`r()` has 110 INFERRED edges - model-reasoned connections that need verification._
- **Are the 98 inferred relationships involving `t()` (e.g. with `CalendarView()` and `GanttView()`) actually correct?**
  _`t()` has 98 INFERRED edges - model-reasoned connections that need verification._