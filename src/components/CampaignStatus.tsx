import campaign from '../data/campaign-status.json'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const date = (value: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(value))

export function CampaignStatus() {
  return <Card>
    <CardHeader><CardTitle className="text-base">ChatGPT veneer campaign</CardTitle></CardHeader>
    <CardContent className="space-y-2 text-sm leading-6">
      <p>{campaign.chatgpt}. Verified {date(campaign.verifiedAt)}.</p>
      <p>${campaign.totalBudgetUsd} total budget · ${campaign.maximumCpcUsd.toFixed(2)} maximum CPC · ends {date(campaign.endsAt)}.</p>
      <p>Automatic creative enhancements: {campaign.creativeEnhancements.toLowerCase()}.</p>
      <p className="text-muted-foreground">{campaign.note} This is a dated verification, not a live Ads Manager feed.</p>
    </CardContent>
  </Card>
}
