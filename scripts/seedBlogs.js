const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seedBlogs() {
  const client = await pool.connect();
  
  // Helper function to generate slug
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  
  try {
    // Get admin user ID
    const adminResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@viscabarca.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found. Please run initDb.js first.');
      return;
    }
    
    const adminId = adminResult.rows[0].id;
    
    // Sample blog posts about FC Barcelona
    const blogs = [
      {
        title: 'El Clasico Preview: Barca Ready to Dominate at the Bernabeu',
        content: `<h2>The Stage is Set for Another Epic Battle</h2>

<p>As we approach the most anticipated match of the La Liga season, FC Barcelona prepares to face their eternal rivals Real Madrid at the Santiago Bernabeu. The atmosphere is electric!</p>

<h3>Current Form Analysis</h3>

<p>Barcelona comes into this clash riding a wave of confidence after their impressive 4-1 victory over Villarreal. The team's attacking prowess has been on full display.</p>

<h3>Key Players to Watch</h3>

<ul>
<li><strong>Robert Lewandowski</strong> - The Polish striker has been in sensational form</li>
<li><strong>Pedri</strong> - Our La Masia gem continues to dictate the tempo</li>
<li><strong>Gavi</strong> - The young warrior's energy will be crucial</li>
<li><strong>Ter Stegen</strong> - Our reliable last line of defense</li>
</ul>

<p><strong>Visca el Barca! 🔴🔵</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['El Clasico', 'Match Preview', 'La Liga', 'Real Madrid']
      },
      {
        title: 'La Masia Magic: The Future is Bright for Barcelona',
        content: `<h2>The Heartbeat of FC Barcelona</h2>

<p>La Masia, FC Barcelona's famed youth academy, has been the cornerstone of the club's philosophy for decades.</p>

<h3>A Legacy of Excellence</h3>

<p>From Messi to Xavi, Iniesta to Busquets, and now Gavi and Pedri - La Masia has been the gift that keeps on giving.</p>

<h3>Current Rising Stars</h3>

<p><strong>Pedri Gonzalez</strong> - At just 21, Pedri has already established himself as one of the world's best midfielders.</p>

<p><strong>Gavi</strong> - This 19-year-old sensation brings intensity, passion, and incredible technical ability.</p>

<p><strong>Lamine Yamal</strong> - The teenager has been turning heads with his incredible dribbling skills.</p>

<h3>The Barcelona DNA</h3>

<p>What makes La Masia graduates special:</p>

<ul>
<li>Possession and ball control</li>
<li>Quick, short passing combinations</li>
<li>Pressing and winning the ball back high up the pitch</li>
<li>Technical excellence over physical attributes</li>
</ul>

<p><strong>Forca Barca! 💙❤️</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['La Masia', 'Youth Academy', 'Pedri', 'Gavi', 'Barcelona DNA']
      },
      {
        title: 'Hyderabad Pena Spotlight: Our Growing Barcelona Family',
        content: `<h2>Unidos por Barca - United by Barcelona</h2>

<p>What started as a small group of passionate Barcelona fans in Hyderabad has blossomed into a vibrant community.</p>

<h3>The Beginning</h3>

<p>Five years ago, a handful of Barcelona supporters would gather at a local cafe to watch matches together. Today, we're one of the largest peñas in India.</p>

<h3>What We Do</h3>

<p><strong>Match Screenings</strong> - Every important Barcelona match is a celebration with giant screens and amazing atmosphere!</p>

<p><strong>Community Events</strong> - We organize meetups, tournaments, and charity drives.</p>

<p><strong>Social Initiatives</strong> - Following Barcelona's motto of being "More than a club"</p>

<p><strong>Visca Barca! Visca Hyderabad Pena! 🔴🔵</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['Hyderabad Pena', 'Community', 'Fan Club', 'Events']
      },
      {
        title: 'Xavi Tactical Revolution: Beautiful Football Returns to Barcelona',
        content: `<h2>The Return to Blaugrana Identity</h2>

<p>When Xavi Hernandez returned to Camp Nou as head coach, he brought a clear vision: restore Barcelona's playing style.</p>

<h3>Back to the Roots</h3>

<h4>1. Dominating Possession</h4>
<p>Barcelona once again controls games through possession, averaging over 65% in most matches.</p>

<h4>2. Positional Play</h4>
<p>Players are positioned in specific zones to create numerical superiority and passing triangles.</p>

<h4>3. High Pressing</h4>
<p>When possession is lost, the team immediately presses to win the ball back high up the pitch.</p>

<h3>Statistical Success</h3>

<ul>
<li>Average of 2.3 goals per game</li>
<li>Pass completion rate of 89%</li>
<li>68% possession average</li>
</ul>

<p><strong>Visca Xavi! Visca Barca! 🔵🔴</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['Xavi', 'Tactics', 'Analysis', 'Playing Style', 'Philosophy']
      },
      {
        title: 'Champions League Dreams: Barcelona Path to European Glory',
        content: `<h2>The Quest for the Sixth Star</h2>

<p>The UEFA Champions League anthem echoing through Camp Nou sends shivers down every cule's spine. Barcelona has won 5 Champions League titles, and we want the sixth!</p>

<h3>European Pedigree</h3>

<ul>
<li><strong>1992 at Wembley</strong> - The first triumph</li>
<li><strong>2006</strong> - Ronaldinho era</li>
<li><strong>2009 & 2011</strong> - Pep's tiki-taka machine</li>
<li><strong>2015</strong> - The legendary MSN trio</li>
</ul>

<h3>This Season Campaign</h3>

<h4>Strengths Going Forward</h4>

<p><strong>Attacking Firepower</strong> - Lewandowski's experience and Raphinha's pace can hurt any defense.</p>

<p><strong>Midfield Control</strong> - Pedri, Gavi, and De Jong form one of Europe's most technically gifted midfield trios.</p>

<p><strong>Visca Barca! 💙❤️⭐⭐⭐⭐⭐</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['Champions League', 'UEFA', 'European Football', 'Tournament']
      },
      {
        title: 'Mes que un Club: Understanding Barcelona Social Impact',
        content: `<h2>More Than a Club - A Philosophy Beyond Football</h2>

<p>"Mes que un club" - More than a club. These three words define FC Barcelona's identity.</p>

<h3>Historical Context</h3>

<p>During Franco's dictatorship in Spain, Camp Nou became a sanctuary where people could freely express their Catalan identity.</p>

<h3>Social Initiatives</h3>

<p><strong>Barca Foundation</strong> - The club's foundation reaches millions of children worldwide through sport-based education programs.</p>

<p><strong>UNICEF Partnership</strong> - Barcelona was the first major club to pay to have a charity logo on their shirt.</p>

<p><strong>Democratic Values</strong> - Barcelona is owned by its members (socis). Over 140,000 members elect the president.</p>

<h3>Our Pena Contribution</h3>

<ul>
<li>Free football coaching for underprivileged children</li>
<li>Educational support programs</li>
<li>Community service initiatives</li>
</ul>

<p><strong>Mes que un club! 💙❤️</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['Club Values', 'Social Impact', 'Mes que un club', 'Philosophy', 'Culture']
      },
      {
        title: 'Match Recap: Barcelona 3-1 Athletic Bilbao - Dominant Display',
        content: `<h2>A Masterclass in Possession Football</h2>

<p>Barcelona delivered a commanding performance against Athletic Bilbao. The 3-1 victory was a statement of intent.</p>

<h3>First Half - Control and Precision</h3>

<p><strong>15' - GOAL! Lewandowski (1-0)</strong> - A textbook Barcelona goal with perfect passing.</p>

<p><strong>28' - GOAL! Raphinha (2-0)</strong> - Beautiful curled finish into the top corner!</p>

<h3>Second Half</h3>

<p><strong>67' - Bilbao pulls one back (2-1)</strong></p>

<p><strong>82' - GOAL! Pedri (3-1)</strong> - Individual brilliance to seal the victory!</p>

<h3>Key Statistics</h3>
<ul>
<li>Possession: 71% - 29%</li>
<li>Pass Completion: 91%</li>
<li>Shots on Target: 8</li>
</ul>

<p><strong>Visca Barca! 🔵🔴</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['Match Recap', 'La Liga', 'Athletic Bilbao', 'Match Analysis']
      },
      {
        title: 'Top 5 Unforgettable Barcelona Moments of the Last Decade',
        content: `<h2>Reliving the Magic</h2>

<p>Barcelona has given us countless memories. Here are five unforgettable moments from the last decade.</p>

<h3>5. The Remontada - Barcelona 6-1 PSG (2017)</h3>

<p>Down 4-0 from the first leg, Barcelona produced the greatest comeback in Champions League history!</p>

<h3>4. Messi Solo Goal vs Bilbao - Copa del Rey Final 2015</h3>

<p>Messi picked up the ball and dribbled past four defenders before chipping the goalkeeper. Pure magic!</p>

<h3>3. Iniesta Last Game at Camp Nou (2018)</h3>

<p>Don Andres said goodbye to Camp Nou. An emotional farewell to a legend.</p>

<h3>2. The Treble Season - 2014/15</h3>

<p>MSN (Messi, Suarez, Neymar) scored 122 goals combined. Historic treble season!</p>

<h3>1. The New Era Begins (2023-Present)</h3>

<p>Xavi's return and the emergence of Pedri and Gavi gives us hope for the future!</p>

<p><strong>Once a cule, always a cule! Visca Barca! 💙❤️</strong></p>`,
        author_id: adminId,
        published: true,
        tags: ['Memories', 'History', 'MSN', 'Messi', 'Iniesta', 'Champions League']
      }
    ];
    
    console.log('📝 Seeding Barcelona blog posts...\n');
    
    for (const blog of blogs) {
      await client.query('BEGIN');
      
      try {
        // Insert blog
        const slug = generateSlug(blog.title);
        const blogResult = await client.query(
          `INSERT INTO blogs (title, slug, content, author_id, published)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, title`,
          [blog.title, slug, blog.content, blog.author_id, blog.published]
        );
        
        const blogId = blogResult.rows[0].id;
        
        // Insert tags
        for (const tagName of blog.tags) {
          // Get or create tag
          let tagResult = await client.query(
            'SELECT id FROM tags WHERE name = $1',
            [tagName]
          );
          
          let tagId;
          if (tagResult.rows.length === 0) {
            const tagSlug = generateSlug(tagName);
            const newTag = await client.query(
              'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
              [tagName, tagSlug]
            );
            tagId = newTag.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }
          
          // Link blog and tag
          await client.query(
            'INSERT INTO blog_tags (blog_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [blogId, tagId]
          );
        }
        
        await client.query('COMMIT');
        console.log(`✅ Created: "${blogResult.rows[0].title}" (ID: ${blogId})`);
        console.log(`   Tags: ${blog.tags.join(', ')}\n`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error creating blog "${blog.title}":`, error.message);
      }
    }
    
    console.log('🎉 Successfully seeded all blog posts!');
    console.log(`📊 Total blogs created: ${blogs.length}`);
    
    // Show tag summary
    const tagsResult = await client.query('SELECT name FROM tags ORDER BY name');
    console.log(`\n🏷️  Total unique tags: ${tagsResult.rows.length}`);
    console.log(`   Tags: ${tagsResult.rows.map(t => t.name).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error seeding blogs:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedBlogs();
