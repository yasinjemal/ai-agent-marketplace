// =============================================================
// Email Templates — Reusable HTML email templates
// All emails share a consistent layout wrapper.
// =============================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-agents.co.za";
const BRAND_COLOR = "#6366f1";
const BRAND_NAME = "AI Agent Marketplace SA";

// -------------------------------------------------------------
// Shared Layout Wrapper
// -------------------------------------------------------------

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { display: inline-block; width: 48px; height: 48px; background-color: ${BRAND_COLOR}; border-radius: 12px; color: white; font-weight: bold; font-size: 20px; line-height: 48px; text-align: center; }
    h1 { color: #0f172a; font-size: 22px; margin: 16px 0 8px; }
    p { color: #475569; font-size: 15px; line-height: 1.6; margin: 8px 0; }
    .cta { display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .cta:hover { background-color: #4f46e5; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-success { background-color: #dcfce7; color: #166534; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
    .badge-info { background-color: #dbeafe; color: #1e40af; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .footer { text-align: center; padding-top: 24px; }
    .footer p { color: #94a3b8; font-size: 12px; }
    .footer a { color: #94a3b8; text-decoration: underline; }
    blockquote { border-left: 3px solid #e2e8f0; padding-left: 16px; margin: 16px 0; color: #64748b; font-style: italic; }
    code { background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .stat { text-align: center; padding: 12px; }
    .stat-value { font-size: 28px; font-weight: 700; color: ${BRAND_COLOR}; }
    .stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">AI</div>
      </div>
      ${body}
    </div>
    <div class="footer">
      <hr class="divider" />
      <p>${BRAND_NAME} · South Africa</p>
      <p><a href="${APP_URL}">Visit Marketplace</a> · <a href="${APP_URL}/dashboard/settings">Email Settings</a></p>
    </div>
  </div>
</body>
</html>`;
}

// -------------------------------------------------------------
// Template: Welcome
// -------------------------------------------------------------

export function welcomeEmail(): { subject: string; html: string; text: string } {
  return {
    subject: "Welcome to AI Agent Marketplace 🇿🇦",
    html: layout(
      "Welcome",
      `<h1>Welcome aboard! 🎉</h1>
      <p>Your account has been created successfully. You're now part of South Africa's AI Agent Marketplace.</p>
      <p>Here's what you can do:</p>
      <ul style="color: #475569; font-size: 15px; line-height: 2;">
        <li>🤖 Browse and execute AI agents from the marketplace</li>
        <li>💳 Subscribe to a plan that fits your business</li>
        <li>👨‍💻 If you're a developer, publish your own agents</li>
      </ul>
      <div style="text-align: center;">
        <a href="${APP_URL}/agents" class="cta">Explore the Marketplace →</a>
      </div>`,
    ),
    text: "Welcome to AI Agent Marketplace! Your account has been created successfully. Visit the marketplace to get started.",
  };
}

// -------------------------------------------------------------
// Template: Subscription Created
// -------------------------------------------------------------

export function subscriptionCreatedEmail(
  planName: string,
  formattedPrice: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Subscription Activated — ${planName} Plan`,
    html: layout(
      "Subscription Activated",
      `<h1>Your subscription is active! 🎉</h1>
      <div class="stat">
        <div class="stat-value">${formattedPrice}<span style="font-size:14px;color:#94a3b8">/mo</span></div>
        <div class="stat-label">${planName} Plan</div>
      </div>
      <p>You now have access to all <strong>${planName}</strong> plan features. Manage your subscription anytime from the billing dashboard.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/dashboard/billing" class="cta">View Billing →</a>
      </div>`,
    ),
    text: `Your ${planName} plan subscription is now active at ${formattedPrice}/month.`,
  };
}

// -------------------------------------------------------------
// Template: Subscription Canceled
// -------------------------------------------------------------

export function subscriptionCanceledEmail(
  planName: string,
  endDate: string,
): { subject: string; html: string; text: string } {
  return {
    subject: "Subscription Canceled",
    html: layout(
      "Subscription Canceled",
      `<h1>Your subscription has been canceled</h1>
      <p>Your <strong>${planName}</strong> plan will remain active until:</p>
      <div class="stat">
        <div class="stat-value" style="font-size:20px;">${endDate}</div>
        <div class="stat-label">Access expires</div>
      </div>
      <p>After this date, you'll be moved to the Free plan. You can resubscribe anytime.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/pricing" class="cta">View Plans →</a>
      </div>`,
    ),
    text: `Your ${planName} subscription has been canceled. It remains active until ${endDate}.`,
  };
}

// -------------------------------------------------------------
// Template: Payment Received
// -------------------------------------------------------------

export function paymentReceivedEmail(
  formattedAmount: string,
  planName: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Payment Received — ${formattedAmount}`,
    html: layout(
      "Payment Received",
      `<h1>Payment Confirmed ✅</h1>
      <div class="stat">
        <div class="stat-value">${formattedAmount}</div>
        <div class="stat-label">${planName} Plan</div>
      </div>
      <p>We've received your payment. Your subscription continues uninterrupted.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/dashboard/billing" class="cta">Billing History →</a>
      </div>`,
    ),
    text: `Payment of ${formattedAmount} received for your ${planName} plan.`,
  };
}

// -------------------------------------------------------------
// Template: Agent Approved
// -------------------------------------------------------------

export function agentApprovedEmail(
  agentName: string,
  agentSlug: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Agent Approved — ${agentName}`,
    html: layout(
      "Agent Approved",
      `<h1>Your agent has been approved! 🎉</h1>
      <p><span class="badge badge-success">APPROVED</span></p>
      <p><strong>${agentName}</strong> is now live on the marketplace and available for businesses to discover and use.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/agents/${agentSlug}" class="cta">View Your Agent →</a>
      </div>`,
    ),
    text: `Your agent "${agentName}" has been approved and is now live on the marketplace.`,
  };
}

// -------------------------------------------------------------
// Template: Agent Rejected
// -------------------------------------------------------------

export function agentRejectedEmail(
  agentName: string,
  reason: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Agent Needs Changes — ${agentName}`,
    html: layout(
      "Agent Needs Changes",
      `<h1>Your agent needs some changes</h1>
      <p><span class="badge badge-warning">CHANGES REQUESTED</span></p>
      <p><strong>${agentName}</strong> was not approved. Here's the feedback:</p>
      <blockquote>${reason}</blockquote>
      <p>Please update your agent and resubmit for review.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/dashboard/agents" class="cta">Edit Agent →</a>
      </div>`,
    ),
    text: `Your agent "${agentName}" needs changes. Reason: ${reason}`,
  };
}

// -------------------------------------------------------------
// Template: Execution Failed
// -------------------------------------------------------------

export function executionFailedEmail(
  agentName: string,
  errorMessage: string,
  executionId: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Execution Failed — ${agentName}`,
    html: layout(
      "Execution Failed",
      `<h1>Agent Execution Failed ⚠️</h1>
      <p>An execution of <strong>${agentName}</strong> has failed.</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:8px 0; color:#94a3b8; font-size:13px;">Error</td>
          <td style="padding:8px 0; font-size:13px;">${errorMessage}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#94a3b8; font-size:13px;">Execution ID</td>
          <td style="padding:8px 0; font-size:13px;"><code>${executionId}</code></td>
        </tr>
      </table>
      <p>Check your agent's endpoint and logs to investigate.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/dashboard/executions" class="cta">View Executions →</a>
      </div>`,
    ),
    text: `Execution of "${agentName}" failed. Error: ${errorMessage}. ID: ${executionId}`,
  };
}

// -------------------------------------------------------------
// Template: Referral Reward
// -------------------------------------------------------------

export function referralRewardedEmail(
  formattedReward: string,
  referredBusinessName: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Referral Reward — ${formattedReward} Credit!`,
    html: layout(
      "Referral Reward",
      `<h1>Referral Reward Earned! 🎁</h1>
      <div class="stat">
        <div class="stat-value">${formattedReward}</div>
        <div class="stat-label">Credit earned</div>
      </div>
      <p><strong>${referredBusinessName}</strong> upgraded to a paid plan through your referral link.</p>
      <p>Keep sharing to earn more rewards!</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/dashboard/referrals" class="cta">View Referrals →</a>
      </div>`,
    ),
    text: `You earned ${formattedReward} from referring ${referredBusinessName}.`,
  };
}

// -------------------------------------------------------------
// Template: Team Invite (for Phase 11)
// -------------------------------------------------------------

export function teamInviteEmail(
  inviterName: string,
  tenantName: string,
  inviteCode: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `You've been invited to ${tenantName}`,
    html: layout(
      "Team Invitation",
      `<h1>You've been invited! 🤝</h1>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on AI Agent Marketplace.</p>
      <p>Click the button below to accept the invitation and join the team.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}/invite/${inviteCode}" class="cta">Accept Invitation →</a>
      </div>
      <p style="font-size:12px; color:#94a3b8;">This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.</p>`,
    ),
    text: `${inviterName} has invited you to join ${tenantName} on AI Agent Marketplace. Accept: ${APP_URL}/invite/${inviteCode}`,
  };
}
