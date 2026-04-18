**RigPro3**

Reports Module --- Full Specification

For AI-Assisted Development Handoff

Prepared by Surpentor Business Solutions LLC · April 2026

  ----------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Document Overview**   
  **Purpose**             Define all changes, additions, and configurations to the RigPro3 Reports Module. Written for implementation by an AI developer or human dev team.
  **Scope**               All six report categories plus the Pipeline Health Index (PHI) system, admin settings, and the PHI Explainer report.
  **How to use**          Read Section 1 for context. Sections 2--8 contain category-by-category instructions. Section 9 contains the PHI full specification. Implement changes in order.
  **Application**         RigPro3 --- web-based estimating and CRM platform for crane, rigging, and industrial transport.
  **Codebase**            C:\\Users\\Scott\\OneDrive\\Documents\\Zelda\\RigPro\\ · Deployment: srestimator.com
  ----------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------

**Table of Contents**

**1. Overview & Change Summary**

This document defines the complete current state and all pending changes
to the RigPro3 reporting module. It is structured so that an AI
developer or human developer can implement each section independently
without requiring additional context.

**1.1 Report Categories**

RigPro3 organizes all reports into six functional categories plus a
seventh dedicated to the Pipeline Health Index explainer. Each category
has its own dashboard. The categories are:

-   Executive --- ownership-level composite views and KPI summaries

-   Pipeline --- active opportunity tracking from RFQ to estimate

-   Customers --- CRM-focused account history and geographic views

-   Finance --- cost, margin, and line-item financial breakdowns

-   Historical --- closed records, lost opportunities, post-mortem data

-   Activity --- system usage, team productivity, and process speed

**1.2 Full Change Register**

The table below summarizes every action required across all categories.
Implement all rows marked NEW or CHANGE. Rows marked EVALUATE require no
code change --- only a written assessment confirming the report
functions correctly as specified.

  ------------------------------------- -------------- -------------- -------------------------------------------------------------------
  **Report Name**                       **Category**   **Action**     **Notes**
  **Executive Dashboard**               Executive      NEW            Full spec in Section 2.1 and Section 9
  **Pipeline Health Index**             Executive      NEW            Full spec in Section 9
  **Revenue vs. Forecast**              Executive      NEW            Line chart, actual vs. forecast, variance callout
  **New vs. Returning Revenue Split**   Executive      NEW            Donut or split bar; % of period revenue by account type
  **Win/Loss Analysis (exec)**          Executive      NEW            Blended win rate % + trend only --- no per-estimator detail
  **Top 10 Customers by Revenue**       Executive      NEW            Ranked list, current vs. prior period, delta indicator
  **Follow-Up Queue**                   Executive      NEW            Open estimates stale \>14d, color-coded by severity
  **PHI Explainer**                     Executive      NEW            Standalone report --- see Section 9.4
  **Pipeline Dashboard**                Pipeline       EVALUATE       Assess funnel visualization RFQ→estimate→won
  **Open Estimates**                    Pipeline       EVALUATE       Confirm color-coded aging thresholds exist
  **Job Schedule**                      Pipeline       RECLASSIFIED   Moved from Historical. Confirm placement.
  **Prospect Report**                   Pipeline       CHANGE         Add last activity date + RFQ count columns
  **Open RFQs**                         Pipeline       EVALUATE       Confirm days-open and assigned estimator columns exist
  **Pipeline Summary**                  Pipeline       CHANGE         Add stale flag for jobs with no activity \>14 days
  **Quote-to-Award by Job Type**        Pipeline       NEW            Win rate by job type: crane/transport/rigging/etc.
  **Customer Activity Dashboard**       Customers      EVALUATE       Confirm widget list matches Section 4.1 spec
  **Neighborhood Report**               Customers      EVALUATE       Confirm zip/proximity sort works
  **Jobs by Customer**                  Customers      RECLASSIFIED   Moved from Activity. Add YOY column + last job date.
  **Customer YOY Comparison**           Customers      NEW            Revenue per customer this year vs. last + delta
  **Customer Health Score**             Customers      NEW            Composite: recency + YOY change + open RFQs
  **Finance Dashboard**                 Finance        NEW            Missing from current build --- spec in Section 5.1
  **Cost & Margin Analysis**            Finance        EVALUATE       Confirm multipliers: Labor 0.6x, Equip 0.7x, Haul 0.85x
  **Sales Adjustment Report**           Finance        RECLASSIFIED   Moved from Activity. Add adjustment reason field.
  **Labor Hours Quoted**                Finance        EVALUATE       Confirm bill rate calculation present
  **Discounts Given**                   Finance        CHANGE         Add margin impact column (actual vs. without discount)
  **Travel Quoted**                     Finance        EVALUATE       Confirm markup tracking present
  **Equipment Quoted**                  Finance        EVALUATE       Confirm shipping/haul charge breakdown present
  **Margin Trend Over Time**            Finance        NEW            Gross margin % by month/quarter as a trend line
  **Backlog Report**                    Finance        NEW            Won jobs not yet complete, grouped by expected completion month
  **Historical Dashboard**              Historical     CHANGE         Define widget inventory --- spec in Section 6.1
  **Inactive Requests**                 Historical     CHANGE         Add reason marked dead field
  **Lost Estimates**                    Historical     CHANGE         Add loss reason and competitor columns
  **Activity Dashboard**                Activity       EVALUATE       Confirm existing metrics match Section 7.1
  **Average Estimate Cycle**            Activity       RECLASSIFIED   Moved from Historical. Add per-estimator breakdown.
  **RFQ Response Time**                 Activity       RECLASSIFIED   Moved from Historical. Add \>48hr red flag threshold.
  **Estimator Activity**                Activity       CHANGE         Add avg margin per estimator + avg response time columns
  **Estimator Response Time**           Activity       NEW            Avg hours RFQ received to first estimate submitted, per estimator
  ------------------------------------- -------------- -------------- -------------------------------------------------------------------

  -------------------------- -------------------------- -------------------------- ------------------------------- -----------------------------------------
  NEW = Build from scratch   CHANGE = Modify existing   RECLASSIFIED = Move only   EVALUATE = Confirm & document   No code change needed for EVALUATE rows
  -------------------------- -------------------------- -------------------------- ------------------------------- -----------------------------------------

**2. Executive Category**

The Executive category provides top-down visibility into the
macro-health of the business. All dashboards in this category must
support both a screen view for daily use and a print/export view
suitable for ownership meetings, banking presentations, and investor
review.

**2.1 Executive Dashboard --- NEW**

The Executive Dashboard is the primary landing screen for ownership. It
combines five KPI cards, a Revenue vs. Forecast chart, a Pipeline Health
Index summary panel, a Top Customers table, and a Follow-Up Queue table
in a single scrollable view.

**Dashboard Layout (Wireframe)**

Build the dashboard in the following zone order, top to bottom:

Zone 1 --- KPI Cards (5 equal-width cards, full row):

+-------------+-------------+-------------+-------------+-------------+
| **Total     | **Estimates | **Customers | **Won       | **Avg Gross |
| RFQs In**   | Given**     | \[12        | Sales**     | Margin**    |
|             |             | new\]**     |             |             |
| 284 ▲ 18%   | 241 (84.9%) |             | \$2.4M ▲    | 31.2% ▼     |
|             |             | 97 total    | 11%         | 1.4pts      |
+-------------+-------------+-------------+-------------+-------------+

Zone 2 --- Chart + PHI panel (split row: 60% chart left, 40% PHI right):

+----------------------------------+----------------------------------+
| **ZONE 2A --- Revenue vs.        | **ZONE 2B --- Pipeline Health    |
| Forecast Chart**                 | Index**                          |
|                                  |                                  |
| Bar chart: forecast bars (gray)  | Blended score (large number,     |
| + actual bars (blue) per month   | color-coded)                     |
|                                  |                                  |
| Y-axis: \$ value \| X-axis:      | Sub-scores: vs. baseline / vs.   |
| month \| Legend above chart      | industry                         |
|                                  |                                  |
| Variance % callout displayed     | Four sub-metric tiles below      |
| above each month pair            | score                            |
|                                  |                                  |
|                                  | Link: \"What is the PHI?\" → PHI |
|                                  | Explainer report                 |
+----------------------------------+----------------------------------+

Zone 3 --- Data Tables (two equal columns):

+----------------------------------+----------------------------------+
| **ZONE 3A --- Top 10 Customers   | **ZONE 3B --- Follow-Up Queue**  |
| by Revenue**                     |                                  |
|                                  | Columns: Customer \| Job \|      |
| Columns: Customer \| Won \$ \|   | Value \| Days Out                |
| vs. Prior \| Badge               |                                  |
|                                  | Days Out color-coded: \<14d      |
| Sorted by Won \$ descending      | green, 14-29d amber, 30+ red     |
|                                  |                                  |
| Delta shown as ▲/▼ colored       | Sorted by Days Out descending    |
| indicators                       |                                  |
|                                  | Period selector at top-right of  |
| \"new\" badge on first-time      | dashboard                        |
| entries                          |                                  |
+----------------------------------+----------------------------------+

**KPI Card Specifications**

  ------------------------------------- -----------------------------------------------------------------------------------------------------------------------
  **KPI Cards --- Field Definitions**   
  **Total RFQs In**                     COUNT of all RFQ records in the selected period. Show % change vs. prior period in the same format.
  **Estimates Given**                   COUNT of estimates submitted. Show as both a raw number and a % of Total RFQs (response rate).
  **Customers**                         COUNT of distinct customers with activity in the period. Highlight new customers (first RFQ ever) with a green badge.
  **Won Sales**                         SUM of won estimate values in the period. Show % change vs. prior period. Color green if positive, red if negative.
  **Avg Gross Margin**                  AVG gross margin % across all won estimates in the period. Show point-change vs. prior period. Color accordingly.
  ------------------------------------- -----------------------------------------------------------------------------------------------------------------------

**Period Selector**

Place a dropdown in the top-right corner of the dashboard. Options: YTD
(default), Q1, Q2, Q3, Q4, Last 12 Months, Custom Range. All five KPI
cards and both tables must update when the period changes. The chart
always shows the last 6 months of the selected range.

**Print / Export Mode**

All Executive dashboards must support a one-click print layout. When
Print is triggered: remove the period selector, expand all tables to
show full data (no truncation), render the PHI as a static color-coded
box, and format the page for 8.5 x 11 output. This mode is used for MBR
(Monthly Business Review) presentations, banking meetings, and investor
reviews.

**2.2 Remaining Executive Reports --- NEW**

The following reports are new additions to the Executive category. Each
appears in the Executive navigation as a standalone report in addition
to the dashboard.

  -------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Revenue vs. Forecast**   
  **Type**                   Bar chart --- forecast bars (gray) behind actual bars (blue) per month
  **Y-axis**                 Dollar value. Format as \$K or \$M depending on scale.
  **X-axis**                 Calendar months for the selected period
  **Variance callout**       Display the % difference between actual and forecast above each month pair. Green if actual \> forecast, red if actual \< forecast.
  **Data source**            Actual: SUM of won estimate values by month. Forecast: A forecast value entered manually per month in admin settings (Phase 1) or calculated from pipeline in Phase 2.
  **Period**                 Controlled by the dashboard period selector
  -------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ---------------------------------------------- ----------------------------------------------------------------------------------------------------------------------
  **New vs. Returning Customer Revenue Split**   
  **Type**                                       Donut chart or horizontal split bar
  **New customer definition**                    A customer whose first-ever Won job falls within the selected period
  **Returning customer definition**              A customer with at least one Won job prior to the selected period
  **Display**                                    Show % and \$ value for each segment. New customers highlighted in a distinct color (e.g., teal). Returning in blue.
  **Insight**                                    Add a one-line trend note: \"New customer revenue is up X% vs. prior period\" if the delta is meaningful.
  ---------------------------------------------- ----------------------------------------------------------------------------------------------------------------------

  ----------------------------------- ----------------------------------------------------------------------------------------------
  **Win/Loss Analysis (Executive)**   
  **Scope**                           Blended win rate only --- no per-estimator breakdown in this report (that lives in Pipeline)
  **Display**                         Single large % number with a trend arrow and sparkline showing the last 6 periods
  **Win rate formula**                COUNT(Won estimates) / COUNT(All submitted estimates) for the period
  **Loss breakdown**                  Show a small donut: Won / Lost / No Response (if tracked)
  **Link**                            Include a link to the full Win/Loss Analysis in the Pipeline category for drill-down
  ----------------------------------- ----------------------------------------------------------------------------------------------

  --------------------------------- --------------------------------------------------------------------------------------------------------------------------
  **Top 10 Customers by Revenue**   
  **Columns**                       Customer name \| Won \$ (current period) \| Won \$ (prior period) \| Delta % \| Status badge
  **Status badges**                 NEW (first time in top 10), GROWTH (delta \> +15%), DECLINE (delta \< -15%), SILENT (prior period revenue, zero current)
  **Sort**                          Descending by Won \$ current period
  **Period**                        Controlled by dashboard period selector
  **Drill-down**                    Customer name links to Customer Activity Dashboard for that account
  --------------------------------- --------------------------------------------------------------------------------------------------------------------------

  --------------------- ------------------------------------------------------------------------------------------------------------------------
  **Follow-Up Queue**   
  **Definition**        All open estimates where the last activity date (status change, note, or contact log) is more than 14 days ago
  **Columns**           Customer \| Job description \| Estimate value \| Days since last activity
  **Color coding**      Green: 14-21 days \| Amber: 22-30 days \| Red: 31+ days
  **Sort**              Descending by days out (most stale first)
  **Action button**     Each row should have a \"Mark Contacted\" button that resets the last activity date and removes the row from the queue
  **Note**              14-day threshold is configurable in PHI admin settings and shared with the PHI stale quote calculation
  --------------------- ------------------------------------------------------------------------------------------------------------------------

**3. Pipeline Category**

The Pipeline category is the operational nucleus for estimators and
sales staff. It tracks all active opportunities from RFQ receipt through
estimate submission and close.

**3.1 Pipeline Dashboard --- EVALUATE**

The Pipeline Dashboard exists in the current build. Confirm the
following elements are present and functioning. No code changes are
required if all items below pass evaluation.

  ------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------
  **Pipeline Dashboard --- Evaluation Checklist**   
  **Funnel visualization**                          A visual showing RFQ count → estimate count → won count with drop-off % at each stage. If missing, add it as Zone 1 of the dashboard.
  **Open pipeline value**                           Total \$ value of all open estimates displayed prominently.
  **Status breakdown**                              Count and value of estimates by status (draft, submitted, won, lost, no response).
  **Period filter**                                 Dashboard responds to a period selector (default: rolling 30 days).
  **Stale flag**                                    Any estimate with no activity in 14+ days is flagged visually (amber/red indicator).
  ------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------

**3.2 Open Estimates --- EVALUATE**

Confirm that the Open Estimates report displays estimates in an aging
format. Required columns: Customer, Job Description, Estimate Value,
Status, Days Open. Confirm that rows are color-coded by aging: green
(\<14 days), amber (14-29 days), red (30+ days). No changes needed if
confirmed.

**3.3 Job Schedule --- RECLASSIFIED**

This report has been moved from the Historical category to Pipeline. It
is a forward-looking view and belongs with active pipeline data, not
closed records. Confirm the report now appears under Pipeline. No logic
changes required --- placement only.

**3.4 Prospect Report --- CHANGE**

The current Prospect Report defines a prospect as any customer with no
Won jobs on record. This is too broad. The following changes are
required:

-   Add column: Last Activity Date (most recent RFQ, estimate, or note
    on this account)

-   Add column: RFQ Count (total RFQs submitted by this prospect,
    including lost/inactive)

-   Add column: Open Estimates (count of currently open estimates for
    this prospect)

-   Sort by Last Activity Date descending (most recently active at top)

-   Add a filter: Hide prospects with no activity in the last 90 days
    (toggle on/off)

The goal is to turn this from a static list into an actionable follow-up
queue for new business development.

**3.5 Pipeline Summary --- CHANGE**

The Pipeline Summary shows open jobs by status and total value. The
following change is required:

-   Add a Stale column: count of estimates in each status bucket that
    have had no activity in 14+ days

-   Add a Stale Value column: total \$ value of those stale estimates

-   Highlight any status row where stale count exceeds 20% of total
    count for that status (amber row highlight)

**3.6 Quote-to-Award by Job Type --- NEW**

  -------------------------------------------------- ---------------------------------------------------------------------------------------------------
  **Quote-to-Award by Job Type --- Specification**   
  **Purpose**                                        Shows win rate segmented by job type to identify which categories of work are most competitive
  **Job types**                                      Crane lift, transport/hauling, rigging, installation, other (driven by job type field on the RFQ)
  **Columns**                                        Job Type \| Quotes Submitted \| Quotes Won \| Win Rate % \| Avg Estimate Value \| Avg Won Value
  **Visualization**                                  Horizontal bar chart showing win rate per job type, sorted descending
  **Period**                                         Controlled by period selector. Default: YTD.
  **Insight row**                                    Highlight the job type with the highest win rate in green. Highlight the lowest in amber.
  -------------------------------------------------- ---------------------------------------------------------------------------------------------------

**4. Customers Category**

The Customers category is the CRM reporting core of RigPro3. It focuses
on account-level history, geographic reach, and customer health. This
category contains RigPro3\'s most unique reports.

**4.1 Customer Activity Dashboard --- EVALUATE**

The Customer Activity Dashboard is a drag-and-drop widget layout unique
to RigPro3. Evaluate and confirm the following widget inventory is
present and populated correctly. If any widget is missing, build it.

  ------------------------------------------------------ ---------------------------------------------------------------------
  **Customer Activity Dashboard --- Required Widgets**   
  **Open Estimates**                                     Count and total value of currently open estimates for this customer
  **Job History**                                        List of all completed/won jobs: date, description, value, margin
  **Last Contact**                                       Date of most recent note, status change, or estimate activity
  **YOY Revenue**                                        Revenue from this customer: current year vs. prior year, with delta
  **Win Rate (this customer)**                           Win rate on estimates specifically for this account
  **RFQ History**                                        All RFQs received from this customer: date, status, value
  **Open RFQs**                                          Count of currently open RFQs with no estimate yet submitted
  **Notes / Activity Log**                               Chronological list of all notes logged against this account
  ------------------------------------------------------ ---------------------------------------------------------------------

Confirm that the dashboard is printable in a clean single-page layout.
Confirm drag-and-drop widget reordering persists per user.

**4.2 Neighborhood Report --- EVALUATE**

Confirm the Neighborhood Report allows filtering/sorting customers by
zip code or geographic proximity. Confirm a map view or sorted list view
is available. Confirm the report includes: Customer Name, City, State,
Zip, Distance from company address (if proximity mode), Last Job Date,
Open Estimates count. No changes needed if confirmed.

**4.3 Jobs by Customer --- RECLASSIFIED + CHANGE**

This report has been moved from Activity to Customers. In addition to
the reclassification, the following columns must be added:

-   YOY comparison column: this year\'s total value vs. prior year\'s
    total value, with delta %

-   Last Job Date: date of most recently completed job for this customer

-   Status indicator: flag accounts where last job date is more than 180
    days ago as \"Dormant\"

**4.4 Customer YOY Comparison --- NEW**

  ----------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------
  **Customer YOY Comparison --- Specification**   
  **Purpose**                                     Side-by-side revenue per customer: current year vs. prior year
  **Columns**                                     Customer \| Current Year \$ \| Prior Year \$ \| Delta \$ \| Delta % \| Status
  **Status values**                               GROWING (delta \> +10%), STABLE (-10% to +10%), DECLINING (\< -10%), NEW (no prior year), LOST (prior year revenue, zero current year)
  **Sort**                                        Descending by current year \$ by default. Filterable by status.
  **Visualization**                               Optional: small sparkline bar per row showing the two year values side by side
  **Purpose note**                                This is the primary churn detection report. LOST and DECLINING accounts should be escalated to the Follow-Up Queue.
  ----------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------

**4.5 Customer Health Score --- NEW**

  --------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------
  **Customer Health Score --- Specification**   
  **Purpose**                                   A composite score per customer indicating relationship health and churn risk
  **Component 1 --- Recency (30%)**             Days since last completed job. \<30 days = 100pts. Linear decay to 0 at 365 days.
  **Component 2 --- Revenue trend (30%)**       YOY revenue delta. +10% or more = 100pts. -10% or more = 0pts. Linear between.
  **Component 3 --- Open RFQs (20%)**           Count of currently open RFQs. 1 or more = 100pts. 0 = 0pts.
  **Component 4 --- Win rate (20%)**            Win rate on estimates for this customer. At or above company average = 100pts. Scaled below.
  **Output**                                    Score 0--100. Bands: 75-100 Healthy (green), 50-74 Monitor (amber), 0-49 At Risk (red).
  **Display**                                   Listed in the Customers section as a sortable column and standalone report. Sortable by score ascending to surface at-risk accounts.
  --------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------

**5. Finance Category**

The Finance category contains RigPro3\'s most industry-specific and
differentiating reports. The cost multiplier logic (Labor 0.6x,
Equipment 0.7x, Hauling 0.85x) is unique to crane and rigging estimating
and must be preserved exactly. These multipliers should be configurable
by an admin in company settings in Phase 2.

**5.1 Finance Dashboard --- NEW**

The Finance category currently has no dashboard. This is the
highest-priority addition in the Finance section. Build the Finance
Dashboard as the default landing page for the Finance category.

Finance Dashboard --- Zone Layout:

+----------------+----------------+----------------+----------------+
| **Total Quoted | **Blended      | **Total        | **Won Backlog  |
| Value**        | Gross Margin** | Discounts      | Value**        |
|                |                | Given**        |                |
| \$4.1M         | 31.2%          |                | \$1.1M         |
|                |                | \$34K          |                |
|                |                | (-1.4pts)      |                |
+----------------+----------------+----------------+----------------+

+----------------------------------+----------------------------------+
| **COST BREAKDOWN --- Stacked Bar | **MARGIN TREND --- Line Chart**  |
| or Donut**                       |                                  |
|                                  | Gross margin % by month over     |
| Labor \| Equipment \| Travel \|  | last 12 months                   |
| Subs & Materials \| Other        |                                  |
|                                  | Reference line at company        |
| Show \$ value and % of total     | baseline margin                  |
| quoted cost per component        |                                  |
+----------------------------------+----------------------------------+

**5.2 Cost & Margin Analysis --- EVALUATE**

Confirm the report includes: Estimate/Quote ID, Customer, Sales Value,
Labor Cost (at 0.6x multiplier), Equipment Cost (at 0.7x), Hauling Cost
(at 0.85x), Other Direct Costs, Total Direct Cost, Gross Margin \$,
Gross Margin %. If any multiplier column is missing or the multipliers
are different, flag for correction. These multipliers are the core
financial model of RigPro3.

**5.3 Sales Adjustment Report --- RECLASSIFIED + CHANGE**

Moved from Activity to Finance. The following field is required in
addition to the existing columns:

-   Adjustment Reason: a required dropdown field logged at the time of
    adjustment. Options: Customer Request, Competitive Pricing,
    Relationship Discount, Estimator Error Correction, Other. Without a
    reason field, this report is a list of changes with no diagnostic
    value.

**5.4 Discounts Given --- CHANGE**

Add the following column to the existing report:

-   Margin Without Discount: what the gross margin % would have been if
    no discount had been applied. Calculated as: (Sales Value + Discount
    Amount - Direct Costs) / (Sales Value + Discount Amount).

-   Margin Impact: the difference in margin points between actual margin
    and margin without discount.

The goal is for ownership to see the true cost of discounting in margin
terms, not just dollar terms.

**5.5 Margin Trend Over Time --- NEW**

  ---------------------------------------------- ------------------------------------------------------------------------------------------------
  **Margin Trend Over Time --- Specification**   
  **Type**                                       Line chart with one data point per month
  **Y-axis**                                     Gross margin % (0% to 60% scale)
  **X-axis**                                     Calendar months, rolling 24-month default
  **Reference lines**                            Dashed line at company baseline margin. Dashed line at industry benchmark margin (28%).
  **Data**                                       AVG gross margin % of all won estimates closed in that calendar month
  **Alert zone**                                 Shade the area below the industry benchmark line in light red to visually indicate danger zone
  **Period**                                     Selectable: 12 months, 24 months, YTD
  ---------------------------------------------- ------------------------------------------------------------------------------------------------

**5.6 Backlog Report --- NEW**

  -------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------
  **Backlog Report --- Specification**   
  **Definition**                         All estimates with Won status where the job has not yet been marked Complete
  **Columns**                            Customer \| Job Description \| Won Value \| Won Date \| Expected Completion Month \| Days Until Expected Completion
  **Grouping**                           Group rows by expected completion month. Show subtotal Won Value per month.
  **Summary KPI**                        Total backlog value displayed at top (this is the \"how busy is next month\" number)
  **Sort**                               By expected completion date ascending
  **Note**                               This report is critical for resource planning and for banking/bonding conversations. It should be included in the MBR print export.
  -------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------

**6. Historical Category**

The Historical category covers closed records, lost opportunities, and
post-mortem data. Reports here are backward-looking. Active operational
metrics (response time, cycle time) have been moved to the Activity
category.

**6.1 Historical Dashboard --- CHANGE**

The current Historical Dashboard description is \"operational roll-ups\"
which is not a sufficient specification. Build or rebuild the Historical
Dashboard with the following defined widget set:

  -------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------
  **Historical Dashboard --- Required Widget Set**   
  **Closed Jobs by Month**                           Bar chart: count of jobs marked Complete or Lost per month, last 12 months
  **Win Rate Trend**                                 Line chart: monthly win rate % over last 12 months with a reference line at company baseline
  **Average Margin Trend**                           Line chart: average gross margin % per month over last 12 months
  **Top Lost-To Customers**                          Table: customers who submitted the most RFQs that became Lost estimates. Columns: Customer \| Lost Quotes \| Lost Value.
  **Inactive RFQ Count**                             Single KPI: count of RFQs marked Dead or Lost in the current period vs. prior period
  **Average Estimate Cycle (historical)**            Average days from RFQ to Won status over the last 12 months. Distinct from the Activity category version which measures current performance.
  -------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------

**6.2 Inactive Requests --- CHANGE**

The following field is required in addition to the existing columns:

-   Reason Marked Dead/Lost: a required dropdown at the time of status
    change. Options: Customer Cancelled, Budget Constraints, No Response
    from Customer, Lost to Competitor, Scope Changed, Other. This
    transforms the report from a graveyard into a diagnostic tool.

**6.3 Lost Estimates --- CHANGE**

Add the following columns to the existing report:

-   Loss Reason: same dropdown as Inactive Requests --- populated at
    time of marking lost

-   Competitor (if known): optional free-text field logged at close.
    This data feeds competitive intelligence over time.

-   Days from Submission to Lost: calculated field showing how long the
    estimate was open before being marked lost

**6.4 Historical Dashboard --- EVALUATE (remaining reports)**

The following Historical reports require evaluation only --- confirm
they exist and function correctly with no code changes:

-   RFQ Response Time: confirm it has been moved to Activity category

-   Average Estimate Cycle: confirm it has been moved to Activity
    category

**7. Activity Category**

The Activity category measures team behaviors, system usage, and process
speed. It is the operational performance scorecard for management. Two
reports have been moved here from Historical (RFQ Response Time and
Average Estimate Cycle) because they measure current process
performance, not historical outcomes.

**7.1 Activity Dashboard --- EVALUATE**

Evaluate the existing Activity Dashboard and confirm the following
metrics are present:

-   Total quotes created in the period

-   Total quotes submitted in the period

-   Average response time (RFQ to first estimate): current period vs.
    prior period

-   Average estimate cycle (RFQ to Won): current period vs. prior period

-   Per-estimator activity summary (quotes created, submitted, won)

If any of the above are missing, add them. The dashboard layout should
follow the same zone pattern as other category dashboards (KPI row at
top, chart or table below).

**7.2 Average Estimate Cycle --- RECLASSIFIED + CHANGE**

Moved from Historical. Add the following:

-   Per-estimator breakdown: show average cycle time per estimator as a
    sortable column

-   Trend line: show average cycle time by month over the last 6 months

-   Target reference line on the trend chart (configurable in admin
    settings)

**7.3 RFQ Response Time --- RECLASSIFIED + CHANGE**

Moved from Historical. Add the following:

-   Threshold flag: any RFQ that took more than 48 hours to receive a
    first estimate must be flagged in red

-   Per-estimator breakdown: show average response time per estimator

-   The 48-hour threshold should be configurable in admin settings

**7.4 Estimator Activity --- CHANGE**

Add the following columns to the existing report:

-   Avg Gross Margin %: average margin on won estimates for this
    estimator

-   Avg Response Time: average hours from RFQ received to first estimate
    submitted for this estimator

With these additions, the Estimator Activity report becomes a full
performance scorecard: volume (quotes in/out), effectiveness (win rate),
quality (margin), and speed (response time).

**7.5 Estimator Response Time --- NEW**

  ----------------------------------------------- --------------------------------------------------------------------------------------------------------------
  **Estimator Response Time --- Specification**   
  **Purpose**                                     Distinct from Average Estimate Cycle --- measures the first touch, not the full cycle
  **Definition**                                  Hours from: RFQ received timestamp → first estimate draft created timestamp
  **Columns**                                     Estimator \| Avg Response Hours \| Median Response Hours \| Count of RFQs \| % Under Target \| % Over 48 hrs
  **Visualization**                               Horizontal bar chart per estimator, sorted by avg response hours ascending
  **Target line**                                 Reference line at the company target (configurable, default 24 hours)
  **Period**                                      Controlled by period selector. Default: rolling 30 days.
  ----------------------------------------------- --------------------------------------------------------------------------------------------------------------

**8. Admin Settings --- PHI Configuration**

A new admin settings panel is required to support the Pipeline Health
Index. This panel must be accessible only to admin-role users. It stores
all configurable values for the PHI scoring engine. All values must be
stored in a database table (phi\_config) with one row per company, not
as hardcoded application constants.

**8.1 phi\_config Database Table**

  ------------------------------------- ---------------------------------------------------------------------------------------------------
  **phi\_config --- Required Fields**   
  **company\_id**                       Foreign key to companies table
  **win\_base**                         Company baseline win rate % (default: populated from rolling 90-day calc when available)
  **vol\_base**                         Company baseline RFQ volume per month (default: rolling 90-day average)
  **margin\_base**                      Company baseline gross margin % (default: rolling 90-day average)
  **stale\_pct\_base**                  Company target: max % of open quotes allowed to be stale (default: 15)
  **response\_days\_base**              Company target response time in days (default: 4)
  **win\_ind**                          Industry benchmark win rate % (default: 30)
  **vol\_ind**                          Industry benchmark RFQ volume / month (default: 30)
  **margin\_ind**                       Industry benchmark gross margin % (default: 28)
  **stale\_pct\_ind**                   Industry benchmark stale % (default: 20)
  **response\_days\_ind**               Industry benchmark response time days (default: 5)
  **blend\_company**                    Weight given to company score in blended calc (default: 70, must sum to 100 with blend\_industry)
  **blend\_industry**                   Weight given to industry score in blended calc (default: 30)
  **w\_aging**                          Component weight: quote aging (default: 30, all five weights must sum to 100)
  **w\_winrate**                        Component weight: win rate (default: 25)
  **w\_volume**                         Component weight: RFQ volume (default: 20)
  **w\_margin**                         Component weight: margin health (default: 15)
  **w\_speed**                          Component weight: response speed (default: 10)
  **band\_atrisk**                      At risk band floor score (default: 40)
  **band\_fair**                        Fair band floor score (default: 60)
  **band\_good**                        Good band floor score (default: 75)
  **band\_excellent**                   Excellent band floor score (default: 90)
  **stale\_days**                       Days before a quote is considered stale (default: 14, shared with Follow-Up Queue)
  **response\_flag\_hrs**               Hours before an RFQ response is flagged red (default: 48, shared with Activity reports)
  **updated\_at**                       Timestamp of last settings save
  **updated\_by**                       User ID of admin who last saved
  ------------------------------------- ---------------------------------------------------------------------------------------------------

**8.2 Validation Rules**

Enforce the following on save:

-   blend\_company + blend\_industry must equal 100. Block save if not.

-   w\_aging + w\_winrate + w\_volume + w\_margin + w\_speed must
    equal 100. Block save if not.

-   band\_atrisk \< band\_fair \< band\_good \< band\_excellent. Block
    save if not.

-   All percentage fields must be between 0 and 100.

-   All day/hour fields must be positive integers.

Display a validation error message adjacent to the offending field, not
as a generic form error. Do not clear the form on validation failure.

**8.3 Admin Panel Layout**

The admin settings panel for PHI should be organized into five
collapsible sections:

1.  Company Baselines --- win rate, volume, margin, stale %, response
    days

2.  Industry Benchmarks --- same five fields, industry values

3.  Blend Ratio --- two sliders locked together (always sum to 100%)

4.  Component Weights --- five sliders with live total validator showing
    current sum

5.  Score Band Thresholds --- four floor values for At Risk, Fair, Good,
    Excellent

Include a live preview: as settings change, show the current PHI score
recalculated in real time using the last actual data point. Label it
clearly as \"Preview with current data.\"

**9. Pipeline Health Index --- Full Specification**

The Pipeline Health Index (PHI) is a composite score from 0 to 100 that
summarizes the overall health of the sales pipeline. It is displayed as
a blended headline number on the Executive Dashboard and as a standalone
interactive report in the Executive category.

**9.1 What the PHI Is**

The PHI is a leading indicator, not a lagging one. Revenue figures tell
ownership what already happened. The PHI signals what is about to
happen. A score declining over 60 days is a warning that a revenue
problem is 30-90 days away --- before it shows up in the financials.

  ---------------------------- -------------------------------------------------------------------------------------------------------------------------------------------
  **PHI --- Why It Matters**   
  **Leading indicator**        Revenue reports show the past. The PHI shows the present state of the pipeline and signals near-future outcomes.
  **Five signals unified**     Quote aging, win rate, incoming volume, margin, and response time each live in separate reports. The PHI watches all five simultaneously.
  **Dual benchmark**           Your score is evaluated against both your own rolling history (are you improving?) and the industry (how do you compare to peers?).
  **Shared language**          Instead of everyone interpreting different spreadsheets differently, the PHI gives ownership and management one number to align on.
  **Actionable**               The PHI always surfaces which component is dragging the score, so the action is clear --- not just that something is wrong.
  ---------------------------- -------------------------------------------------------------------------------------------------------------------------------------------

**9.2 Scoring Formula**

The PHI is calculated in three steps:

6.  Calculate PHI-Company: score each component against your company
    baselines, apply component weights, normalize to 0-100.

7.  Calculate PHI-Industry: score each component against industry
    benchmarks, apply same component weights, normalize to 0-100.

8.  Blend: PHI = (PHI-Company × blend\_company%) + (PHI-Industry ×
    blend\_industry%)

  ----------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Component Scoring Logic**                     
  **C1 --- Quote Aging (default 30pts max)**      Stale % = count of open estimates with no activity in stale\_days / total open estimates. Score: 30pts at 0% stale, linear decay to 0pts at 40% stale. Formula: MAX(0, 30 × (1 - stale\_pct / 0.40))
  **C2 --- Win Rate (default 25pts max)**         Compare current win rate to baseline. Score starts at 17.5pts at baseline. +5pts per 5% above baseline, -5pts per 5% below. Clamped 0 to 25. Formula: CLAMP(17.5 + ((win\_rate - baseline\_win) / 0.05) × 5, 0, 25)
  **C3 --- RFQ Volume (default 20pts max)**       Full 20pts if volume \>= baseline. Linear decay below. Formula: IF(vol \>= baseline, 20, MAX(0, 20 × (vol / baseline)))
  **C4 --- Margin Health (default 15pts max)**    Baseline margin = 10pts. +1.5pts per margin point above baseline, -1.5pts per margin point below. Clamped 0 to 15. Formula: CLAMP(10 + (margin - baseline\_margin) × 1.5, 0, 15)
  **C5 --- Response Speed (default 10pts max)**   Under 2 days = 10pts. Over 7 days = 0pts. Linear between. Formula: IF(days \<= 2, 10, IF(days \>= 7, 0, (1 - (days - 2) / 5) × 10))
  **Normalization**                               Raw total = (C1 × w\_aging) + (C2 × w\_winrate) + (C3 × w\_volume) + (C4 × w\_margin) + (C5 × w\_speed). Max possible = same formula with each component at max. PHI = ROUND((raw\_total / max\_possible) × 100)
  ----------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**9.3 Score Bands**

  --------------- --------------- ------------------------------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------- --------------------------------------------
  **Score**       **Band**        **What it means**                                                                                             **Owner action**                                                                             **Management action**
  **0 -- 39**     **Critical**    Multiple components significantly underperforming. Revenue shortfall likely within 30-60 days.                Immediate review. Identify two lowest-scoring components and act directly.                   Emergency pipeline review this week.
  **40 -- 59**    **At Risk**     One or more components trending poorly. Functional but vulnerable. A continued slide becomes Critical.        Management review this week. Assign owners to flagged components.                            Weekly check-in on flagged items.
  **60 -- 74**    **Fair**        Pipeline operating adequately but below your standard. No crisis, but performance is not optimal.             Monitor weekly. Check which component dropped and whether it is a trend or one-time event.   No escalation needed unless trending down.
  **75 -- 89**    **Good**        Pipeline healthy. All major components at or near baseline. Business in a strong position.                    Maintain current practices. Use trend over time to confirm score stability.                  No action needed.
  **90 -- 100**   **Excellent**   Pipeline outperforming on all fronts. Rare --- protect it. This becomes your new baseline reference period.   Document what is working. Use this period as a benchmark.                                    Celebrate. Protect the inputs.
  --------------- --------------- ------------------------------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------- --------------------------------------------

**9.4 PHI Explainer Report --- NEW**

The PHI Explainer is a standalone report in the Executive category. It
is not a data report --- it is a reference document that explains what
the PHI is, how it is calculated, and what each component and band
means. It is designed to be given to a new employee, a banker, or an
investor who asks \"what does this number mean?\"

  -------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **PHI Explainer --- Required Sections**      
  **Section 1: What is the PHI?**              Plain language explanation of purpose. Use the four Why It Matters points from Section 9.1 above.
  **Section 2: The five components**           One paragraph per component explaining what it measures, why it matters, and what the scoring formula does. Include the formula in plain English.
  **Section 3: Score bands**                   The full band table from Section 9.3 including owner and management action columns.
  **Section 4: How the blended score works**   Step-by-step: company score + industry score → blend → headline number. Include current blend ratio from admin settings.
  **Section 5: How to improve your score**     One bullet per component with the single most actionable lever. Example: \"To improve Quote Aging --- move the oldest estimates to the Follow-Up Queue and contact them this week.\"
  **Print mode**                               The PHI Explainer must be printable as a clean multi-page document. It is the most likely Executive report to be printed and handed to someone outside the system.
  -------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**9.5 PHI Display Rules**

Follow these rules when rendering the PHI score anywhere in the
application:

-   The headline number is always the blended score, rounded to the
    nearest whole number.

-   Color the number and its background according to the band: Critical
    = red, At Risk / Fair = amber, Good / Excellent = green.

-   Always show both sub-scores (vs. your baseline, vs. industry)
    beneath the headline, in a smaller font.

-   Always show the band label (e.g., \"Good\") adjacent to or beneath
    the number.

-   Always show the blend ratio in muted text (e.g., \"70% company / 30%
    industry\").

-   A \"What is this?\" link must appear near the PHI score on the
    Executive Dashboard, linking to the PHI Explainer report.

-   On the Executive Dashboard, the PHI panel must include the four
    sub-metric tiles: open pipeline value, win rate, stale quote count,
    avg estimate cycle.

**10. Implementation Order**

Implement in the following sequence to minimize dependency conflicts:

9.  Database: Create phi\_config table (Section 8.1). All PHI features
    depend on this.

10. Reclassifications: Move Job Schedule → Pipeline, Jobs by Customer →
    Customers, Sales Adjustment → Finance, RFQ Response Time → Activity,
    Average Estimate Cycle → Activity. These are nav/category changes
    only --- no logic changes.

11. CHANGE items: All reports marked CHANGE in the register (Section
    1.2). These add columns or fields to existing reports. Do these
    before NEW items so the data model is complete.

12. Admin settings panel: Build the PHI admin settings UI and wire it to
    phi\_config (Section 8.2 - 8.3).

13. PHI scoring engine: Implement the calculation logic (Section 9.2) as
    a reusable service/function that accepts phi\_config values and
    current period metrics and returns PHI-Company, PHI-Industry, and
    PHI-Blended.

14. PHI Explainer report: Build the static explainer page (Section 9.4).

15. Executive Dashboard: Build the full dashboard (Section 2.1)
    including the PHI panel.

16. Finance Dashboard: Build the Finance Dashboard (Section 5.1) ---
    currently missing entirely.

17. Historical Dashboard: Rebuild with defined widget set (Section 6.1).

18. NEW reports: All remaining new reports in order: Quote-to-Award by
    Job Type, Customer YOY Comparison, Customer Health Score, Margin
    Trend Over Time, Backlog Report, Estimator Response Time, Revenue
    vs. Forecast, New vs. Returning Revenue Split.

19. EVALUATE items: Final pass --- confirm all EVALUATE reports match
    their specifications. Document findings.

*End of Document*

RigPro3 Reports Module Specification · Surpentor Business Solutions LLC
· April 2026
