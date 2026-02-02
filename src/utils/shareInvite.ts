/**
 * Share Invite Utility
 *
 * Provides functionality to share household invites via the native share sheet.
 */

import { Share, Platform } from 'react-native';

/**
 * Share a household invite via the native share sheet.
 *
 * @param inviterName - Name of the person sending the invite
 * @param inviteeName - Name of the person being invited (optional)
 * @param joinCode - 6-character join code for the household
 */
export async function shareHouseholdInvite(
  inviterName: string,
  inviteeName: string | undefined,
  joinCode: string
): Promise<boolean> {
  const greeting = inviteeName ? `Hi ${inviteeName}, ` : '';
  
  // TODO: Replace with actual App Store link once published
  const appStoreLink = 'https://apps.apple.com/app/house-cup';
  
  const message = `${greeting}${inviterName} invited you to join their household in House Cup!

Download the app: ${appStoreLink}

Join code: ${joinCode}`;

  try {
    const result = await Share.share(
      {
        message,
        ...(Platform.OS === 'ios' ? { title: 'Join my House Cup household' } : {}),
      },
      {
        subject: 'Join my House Cup household',
      }
    );

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Failed to share invite:', error);
    return false;
  }
}

export default shareHouseholdInvite;
