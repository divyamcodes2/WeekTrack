const User = require('../models/User');
const { isEncryptionConfigured, encryptApiKey } = require('../utils/crypto');

/**
 * PUT /api/users/gemini-key
 * Save or update the logged-in user's Gemini API key (encrypted at rest).
 */
exports.saveGeminiKey = async (req, res, next) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ message: 'A valid API key is required' });
    }

    if (!isEncryptionConfigured()) {
      console.warn('[Security] Cannot save Gemini API key: ENCRYPTION_SECRET is not configured on server.');
      return res.status(503).json({
        message: 'API key encryption is currently unavailable on the server. Please contact administrator.',
      });
    }

    const trimmedKey = apiKey.trim();
    let encryptedPayload;
    try {
      encryptedPayload = encryptApiKey(trimmedKey);
    } catch (encErr) {
      console.error('[Security] Key encryption failed');
      return res.status(500).json({ message: 'Failed to encrypt API key securely' });
    }

    const last4 = trimmedKey.slice(-4);

    await User.findByIdAndUpdate(req.user._id || req.user.id, {
      geminiApiKeyEncrypted: encryptedPayload,
      geminiApiKeyLast4: last4,
      $unset: { geminiApiKey: 1 }, // remove legacy plaintext key if any
    });

    // Return masked version for confirmation (last 4 chars only)
    const masked = '•'.repeat(Math.max(0, trimmedKey.length - 4)) + last4;

    res.json({
      success: true,
      hasKey: true,
      maskedKey: masked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/gemini-key/status
 * Check whether the logged-in user has a Gemini API key saved.
 * Never returns the actual key value.
 */
exports.getGeminiKeyStatus = async (req, res, next) => {
  try {
    if (!isEncryptionConfigured()) {
      return res.json({ hasKey: false, maskedKey: null });
    }

    const user = await User.findById(req.user._id || req.user.id).select('+geminiApiKeyEncrypted geminiApiKeyLast4');

    const hasKey = !!(user?.geminiApiKeyEncrypted && user.geminiApiKeyEncrypted.trim().length > 0);

    // Return masked key for display (last 4 chars only)
    let maskedKey = null;
    if (hasKey && user.geminiApiKeyLast4) {
      maskedKey = '•'.repeat(16) + user.geminiApiKeyLast4;
    }

    res.json({ hasKey, maskedKey });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/gemini-key
 * Remove the logged-in user's Gemini API key.
 */
exports.deleteGeminiKey = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id || req.user.id, {
      $unset: { geminiApiKeyEncrypted: 1, geminiApiKeyLast4: 1, geminiApiKey: 1 },
    });

    res.json({ success: true, hasKey: false });
  } catch (error) {
    next(error);
  }
};
