import fetch from 'node-fetch';

async function testYouTubeTranscript() {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  const url = "https://youtube.com/shorts/pOTgZwultu8?si=EUffu8EwfgBgAyC2";
  const baseUrl = "https://api.scrapecreators.com";
  
  console.log('Testing YouTube transcript API...');
  console.log('API Key present:', !!apiKey);
  console.log('URL:', url);
  
  try {
    const endpoint = `${baseUrl}/v1/youtube/video/transcript`;
    const params = new URLSearchParams({ url: url });
    const fullUrl = `${endpoint}?${params}`;
    
    console.log('Full API URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed JSON:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Failed to parse as JSON');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testYouTubeTranscript();