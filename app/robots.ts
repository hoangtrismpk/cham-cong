import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/login'],
            disallow: ['/admin/', '/api/', '/settings/', '/schedule/', '/timesheets/', '/unauthorized/'],
        },
        sitemap: 'https://chamcong.fhbvietnam.com/sitemap.xml',
    }
}
