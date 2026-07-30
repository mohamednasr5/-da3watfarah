/**
 * دعوة فرح - Cloudflare Worker
 * Handles R2 Storage uploads and serves files
 * 
 * This worker is bound to R2 bucket: farah
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-custom-header',
        };
        
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        // API Routes
        // Upload endpoint
        if (url.pathname === '/api/upload' && request.method === 'POST') {
            return handleUpload(request, env, corsHeaders);
        }
        
        // Delete endpoint
        if (url.pathname === '/api/delete' && request.method === 'DELETE') {
            return handleDelete(request, env, corsHeaders);
        }
        
        // List files endpoint
        if (url.pathname === '/api/list' && request.method === 'GET') {
            return handleList(request, env, corsHeaders);
        }
        
        // Serve static files from R2
        if (url.pathname.startsWith('/files/')) {
            return serveFile(url, env, corsHeaders);
        }
        
        // Health check
        if (url.pathname === '/health') {
            return jsonResponse({ status: 'ok', service: 'da3watfarah-worker', timestamp: new Date().toISOString() }, corsHeaders);
        }
        
        // Default response
        return jsonResponse({
            message: 'Da3wat Farah API',
            version: '1.0.0',
            endpoints: [
                'POST /api/upload - Upload file to R2',
                'DELETE /api/delete - Delete file from R2',
                'GET /api/list - List files in bucket',
                'GET /files/:key - Serve file from R2'
            ]
        }, corsHeaders, 200);
    },
};

/**
 * Handle file upload to R2
 */
async function handleUpload(request, env, corsHeaders) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || 'uploads';
        
        if (!file) {
            return errorResponse('No file provided', 400, corsHeaders);
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return errorResponse('File too large. Maximum size is 10MB', 400, corsHeaders);
        }
        
        // Validate file type
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'audio/mpeg',
            'audio/wav',
            'audio/mp3',
            'video/mp4'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            return errorResponse('File type not allowed', 400, corsHeaders);
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split('.').pop();
        const key = `${folder}/${timestamp}_${randomId}.${extension}`;
        
        // Upload to R2
        await env.FARAH.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type,
                contentDisposition: `inline; filename="${file.name}"`
            }
        });
        
        // Return file URL
        const publicUrl = `${env.PUBLIC_URL}/${key}`;
        
        return jsonResponse({
            success: true,
            key: key,
            url: publicUrl,
            name: file.name,
            size: file.size,
            type: file.type
        }, corsHeaders, 201);
        
    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse('Failed to upload file', 500, corsHeaders);
    }
}

/**
 * Handle file deletion from R2
 */
async function handleDelete(request, env, corsHeaders) {
    try {
        const { key } = await request.json();
        
        if (!key) {
            return errorResponse('No key provided', 400, corsHeaders);
        }
        
        // Check if file exists
        const object = await env.FARAH.get(key);
        if (!object) {
            return errorResponse('File not found', 404, corsHeaders);
        }
        
        // Delete from R2
        await env.FARAH.delete(key);
        
        return jsonResponse({
            success: true,
            message: 'File deleted successfully',
            key: key
        }, corsHeaders);
        
    } catch (error) {
        console.error('Delete error:', error);
        return errorResponse('Failed to delete file', 500, corsHeaders);
    }
}

/**
 * List files in R2 bucket
 */
async function handleList(request, env, corsHeaders) {
    try {
        const url = new URL(request.url);
        const prefix = url.searchParams.get('prefix') || '';
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        
        const listed = await env.FARAH.list({
            prefix: prefix,
            limit: limit
        });
        
        const files = listed.objects.map(obj => ({
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded.toISOString(),
            url: `${env.PUBLIC_URL}/${obj.key}`
        }));
        
        return jsonResponse({
            success: true,
            count: files.length,
            files: files,
            truncated: listed.truncated
        }, corsHeaders);
        
    } catch (error) {
        console.error('List error:', error);
        return errorResponse('Failed to list files', 500, corsHeaders);
    }
}

/**
 * Serve file from R2
 */
async function serveFile(url, env, corsHeaders) {
    try {
        const key = url.pathname.replace('/files/', '');
        
        const object = await env.FARAH.get(key);
        
        if (!object) {
            return errorResponse('File not found', 404, corsHeaders);
        }
        
        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Length', object.size.toString());
        headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        return new Response(object.body, { headers });
        
    } catch (error) {
        console.error('Serve error:', error);
        return errorResponse('Failed to serve file', 500, corsHeaders);
    }
}

/**
 * Helper: JSON response
 */
function jsonResponse(data, headers, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        }
    });
}

/**
 * Helper: Error response
 */
function errorResponse(message, status, headers) {
    return jsonResponse({
        success: false,
        error: message
    }, headers, status);
}
