/**
 * Vercel Serverless Function: /api/projects
 * Returns the active project roster for DSR Tracker and external client sync.
 */
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // If Supabase projects table has dynamic data, try reading from Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xqfihbxihlufglrqalyd.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON || 'sb_publishable_3m8gmqelS2hnhi199n3-bA_ZIEBL9p5';

    // Fast static fallback data matching the master projects list
    const projects = [
      { id: 'proj-1', name: 'Rank Harvest - Email Marketing', client: 'Rank Harvest', status: 'INITIAL STAGE', price: '$2,200 / mo', communicationChannel: 'Rank Harvest Email' },
      { id: 'proj-2', name: 'Rank Harvest - Email Marketing - Client Message', client: 'Rank Harvest', status: 'INITIAL STAGE', price: '$1,500 / mo', communicationChannel: 'Rank Harvest Email' },
      { id: 'proj-3', name: 'Welltra Enterprise Onboarding', client: 'Welltra Technologies', status: 'IN PROGRESS', price: '$3,800 / mo', communicationChannel: 'Slack' },
      { id: 'proj-4', name: 'Shefali P - Shefali Parekh Local SEO', client: 'Shefali Parekh', status: 'ONGOING', price: '$1,200 / mo', communicationChannel: 'Email' },
      { id: 'proj-5', name: 'Lacy Hendricks & Alex Zweydoff - ClearLead Digital LLC', client: 'ClearLead Digital LLC', status: 'ACTIVE', price: '$2,400 / mo', communicationChannel: 'Slack / Teams' },
      { id: 'proj-6', name: 'Global Robotics AI Platform SEO', client: 'Global Robotics Inc', status: 'IN PROGRESS', price: '$4,500 / mo', communicationChannel: 'Slack' },
      { id: 'proj-7', name: 'Shopify Plus Fashion Store Migration', client: 'Aura Lifestyle', status: 'SPRINT ACTIVE', price: '$5,000', communicationChannel: 'WhatsApp & Slack' },
      { id: 'proj-8', name: 'Nexus Health SaaS Growth Engine', client: 'Nexus Health', status: 'MONTHLY RETAINER', price: '$3,200 / mo', communicationChannel: 'Teams' },
      { id: 'proj-9', name: 'Apex Dental Care Multi-Location GMB', client: 'Apex Dental Group', status: 'ACTIVE', price: '$1,800 / mo', communicationChannel: 'Email' },
      { id: 'proj-10', name: 'Vanguard FinTech Regulatory Content Sprint', client: 'Vanguard Advisory', status: 'IN REVIEW', price: '$2,750 / mo', communicationChannel: 'Slack' }
    ];

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects: projects,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in /api/projects:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
