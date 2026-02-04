
export const AVAILABLE_AVATARS = [
    '/avatars/avatar_male_1.png',
    '/avatars/avatar_male_2.png',
    '/avatars/avatar_male_3.png',
    '/avatars/avatar_female_1.png',
    '/avatars/avatar_female_2.png',
    '/avatars/avatar_female_3.png',
]

export function getDefaultAvatar(userId: string): string {
    if (!userId) return AVAILABLE_AVATARS[0]

    // Simple hash function to get a consistent index
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }

    const index = Math.abs(hash) % AVAILABLE_AVATARS.length
    return AVAILABLE_AVATARS[index]
}
