import express from 'express'
import cors from 'cors'
import authPayload from './routes/auth'
import cookieParser from 'cookie-parser'

export const app = express()

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())

app.get('/api/ping', (req, res) => {
    res.json({ message: 'server is running' })
})

app.use("/api/auth", authPayload)
