// Paste this in browser console (F12 > Console) while logged in as admin
// It will test clan creation

async function testClanCreation() {
  const testName = `TestClan_${Date.now()}`;
  const testTag = `T${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  console.log('🧪 Testing clan creation with:');
  console.log('  Name:', testName);
  console.log('  Tag:', testTag);
  console.log('');

  try {
    const response = await fetch('/api/clans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: testName,
        tag: testTag,
        description: 'Test clan'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! Clan created:', data.data._id);
      console.log(data);

      // Delete it
      await fetch(`/api/clans/${data.data._id}`, { method: 'DELETE' });
      console.log('🗑️  Test clan deleted');
    } else {
      console.log('❌ ERROR:', data.message);
      console.log('Response:', data);
      console.log('');
      console.log('📊 Error Analysis:');
      console.log('  - Message format:', data.message);
      console.log('  - Has "field" property?', !!data.field);
      console.log('  - Field name:', data.field);

      if (data.message?.includes('(active clan)')) {
        console.log('✅ This is the NEW error format - fix is deployed!');
      } else if (data.message?.includes('Clan name or tag')) {
        console.log('⚠️  This is the OLD error format - server not restarted yet');
      }
    }
  } catch (err) {
    console.error('❌ Network error:', err);
  }
}

testClanCreation();
