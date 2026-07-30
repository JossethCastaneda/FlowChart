import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const project = await prisma.project.findUnique({
    where: { id: 'cmrxxh0kj000004lcr65zc6tr' },
    include: { connectedSources: true }
  });
  if (!project) return console.log("Project not found");
  
  const metaSource = project.connectedSources.find(s => s.provider === "META");
  if (!metaSource) return console.log("No meta source");
  
  console.log("Token:", metaSource.accessToken.substring(0, 10) + "...");
  
  const res = await fetch(`https://graph.facebook.com/v18.0/${metaSource.adAccountId}/ads?fields=creative{id,name,object_story_spec,asset_feed_spec}&access_token=${metaSource.accessToken}`);
  const data = await res.json();
  
  const videoAd = data.data?.find(d => 
    d.creative?.object_story_spec?.video_data || 
    (d.creative?.asset_feed_spec?.videos && d.creative.asset_feed_spec.videos.length > 0)
  );
  
  if (!videoAd) return console.log("No video ads found");
  
  console.log("Found video ad creative:", JSON.stringify(videoAd.creative, null, 2));
  
  const videoId = videoAd.creative?.object_story_spec?.video_data?.video_id || videoAd.creative?.asset_feed_spec?.videos[0]?.video_id;
  
  console.log("Video ID:", videoId);
  
  if (!videoId) return;

  const videoRes = await fetch(`https://graph.facebook.com/v18.0/?ids=${videoId}&fields=source&access_token=${metaSource.accessToken}`);
  const videoData = await videoRes.json();
  
  console.log("Video Source response:", JSON.stringify(videoData, null, 2));

  const directRes = await fetch(`https://graph.facebook.com/v18.0/${videoId}?fields=source,video_url&access_token=${metaSource.accessToken}`);
  console.log("Direct Video response:", JSON.stringify(await directRes.json(), null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
