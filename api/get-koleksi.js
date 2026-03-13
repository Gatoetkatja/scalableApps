const { createClient } = require('@supabase/supabase-js')
const { createClient: createRedisClient } = require('redis')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redisClient = createRedisClient({ url: redisUrl })

redisClient.connect().catch(console.error)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'ID is required' })
  }

  try {
    const cachedData = await redisClient.get(`detail:${id}`)
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData))
    }

    const { data, error } = await supabase
      .from('koleksi')
      .select('judul, pencipta, tahun, harga, path')
      .eq('id', id)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Detail not found' })
    }

    await redisClient.setEx(`detail:${id}`, 3600, JSON.stringify(data))

    return res.status(200).json(data)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}