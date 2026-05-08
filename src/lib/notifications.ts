import { Resend } from 'resend'
import twilio from 'twilio'
import { GroupingResult } from './grouping'
import { formatEventDate, formatTeeTime } from './events'
import { TEE_LABELS } from '@/types'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}
function getTwilio() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? 'friday@frostcreek.com'
const FROM_PHONE = process.env.TWILIO_FROM_NUMBER ?? ''
const PRO_SHOP_EMAIL = 'bwelsh@frostcreek.com'

function buildFullScheduleText(
  eventDateStr: string,
  result: GroupingResult
): string {
  const dateLabel = formatEventDate(eventDateStr)
  let text = `Friday Golf – ${dateLabel}\n\nFULL SCHEDULE:\n\n`

  result.groups.forEach((g) => {
    text += `${formatTeeTime(g.tee_time)} – Group ${g.group_number}\n`
    g.players.forEach((p) => {
      text += `  • ${p.first_name} ${p.last_name}`
      if (p.ghin_number) text += ` (GHIN: ${p.ghin_number})`
      text += ` – ${TEE_LABELS[p.signup.tee_preference]}\n`
    })
    text += '\n'
  })

  if (result.waitlist.length > 0) {
    text += `WAITLIST:\n`
    result.waitlist.forEach((p, i) => {
      text += `  ${i + 1}. ${p.first_name} ${p.last_name}\n`
    })
  }

  return text
}

function buildFullScheduleHtml(
  eventDateStr: string,
  result: GroupingResult
): string {
  const dateLabel = formatEventDate(eventDateStr)

  let groupsHtml = result.groups
    .map(
      (g) => `
      <div style="margin-bottom:24px;background:#f9f7f4;border-radius:8px;padding:16px;">
        <div style="font-weight:700;font-size:16px;color:#2d5a1b;margin-bottom:8px;">
          ${formatTeeTime(g.tee_time)} — Group ${g.group_number}
        </div>
        <ul style="margin:0;padding-left:20px;">
          ${g.players
            .map(
              (p) =>
                `<li style="margin-bottom:4px;">${p.first_name} ${p.last_name}${p.ghin_number ? ` <span style="color:#888;">(GHIN: ${p.ghin_number})</span>` : ''} — <em>${TEE_LABELS[p.signup.tee_preference]}</em></li>`
            )
            .join('')}
        </ul>
      </div>`
    )
    .join('')

  const waitlistHtml =
    result.waitlist.length > 0
      ? `<div style="margin-top:24px;"><strong>Waitlist:</strong><ol>${result.waitlist.map((p) => `<li>${p.first_name} ${p.last_name}</li>`).join('')}</ol></div>`
      : ''

  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="https://frostcreek.com/wp-content/uploads/2015/07/fc-logo.png" alt="Frost Creek" style="height:80px;" />
      </div>
      <h2 style="color:#2d5a1b;text-align:center;">Friday Golf — ${dateLabel}</h2>
      <p style="text-align:center;color:#555;">Tee times begin at 12:00 PM • 10-minute intervals</p>
      <hr style="border:1px solid #d4c9a8;margin:20px 0;" />
      ${groupsHtml}
      ${waitlistHtml}
      <hr style="border:1px solid #d4c9a8;margin:20px 0;" />
      <p style="text-align:center;font-size:12px;color:#888;">
        Questions? Call the Pro Shop: 970.328.2326 Ext. 1 &nbsp;|&nbsp;
        <a href="mailto:bwelsh@frostcreek.com">bwelsh@frostcreek.com</a>
      </p>
    </div>`
}

export async function sendNotifications(
  eventDateStr: string,
  result: GroupingResult
): Promise<void> {
  const fullScheduleText = buildFullScheduleText(eventDateStr, result)
  const fullScheduleHtml = buildFullScheduleHtml(eventDateStr, result)
  const dateLabel = formatEventDate(eventDateStr)

  // Send individual emails + texts to each confirmed player
  for (const group of result.groups) {
    for (const player of group.players) {
      const personalText =
        `Hi ${player.first_name}! Your Friday tee time at Frost Creek:\n\n` +
        `📅 ${dateLabel}\n` +
        `⏰ ${formatTeeTime(group.tee_time)}\n` +
        `🏌️ Group ${group.group_number}: ` +
        group.players.map((p) => `${p.first_name} ${p.last_name}`).join(', ') +
        `\n\n` +
        fullScheduleText

      const mailer = getResend()

      // Email
      await mailer.emails.send({
        from: FROM_EMAIL,
        to: player.email,
        subject: `Your Friday Tee Time – ${dateLabel}`,
        html:
          `<p>Hi ${player.first_name}!</p>` +
          `<p><strong>Your tee time:</strong> ${formatTeeTime(group.tee_time)}<br/>` +
          `<strong>Your group:</strong> ${group.players.map((p) => `${p.first_name} ${p.last_name}`).join(', ')}</p>` +
          fullScheduleHtml,
      })

      // SMS
      if (player.phone) {
        const smsText =
          `Frost Creek Friday – ${dateLabel}\n` +
          `Your tee time: ${formatTeeTime(group.tee_time)}\n` +
          `Group: ${group.players.map((p) => `${p.first_name} ${p.last_name}`).join(', ')}\n` +
          `Full schedule emailed to you.`

        await getTwilio().messages.create({
          body: smsText,
          from: FROM_PHONE,
          to: normalizePhone(player.phone),
        })
      }
    }
  }

  const mailer = getResend()

  // Notify waitlisted players
  for (const player of result.waitlist) {
    await mailer.emails.send({
      from: FROM_EMAIL,
      to: player.email,
      subject: `Friday Golf Waitlist – ${dateLabel}`,
      html: `<p>Hi ${player.first_name},</p><p>Unfortunately, you are on the waitlist for Friday, ${dateLabel}. We'll notify you if a spot opens up.</p><p>Questions? Call 970.328.2326 Ext. 1</p>`,
    })
  }

  // Alert pro shop if 31+ players triggered overflow
  if (result.proShopAlert) {
    await mailer.emails.send({
      from: FROM_EMAIL,
      to: PRO_SHOP_EMAIL,
      subject: `⚠️ Friday Golf – Extra Player(s) Need Tee Time`,
      html: `<p>There are ${result.waitlist.length} player(s) on the waitlist who could form an additional group if an extra tee time can be added. Please review and confirm.</p>${fullScheduleHtml}`,
    })
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`
}
