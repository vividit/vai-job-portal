import DocumentType from "../models/DocumentType.js";
import VerificationRule from "../models/VerificationRule.js";
import Document from "../models/Document.js";

// DOCUMENT TYPES MANAGEMENT

// Get all document types
export const getDocumentTypes = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const documentTypes = await DocumentType.find(query)
      .populate('createdBy', 'name email')
      .sort({ sortOrder: 1, createdAt: -1 });

    res.json({ documentTypes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create document type
export const createDocumentType = async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      category,
      allowedFileTypes,
      maxFileSize,
      hasExpiry,
      metadataFields,
      sortOrder
    } = req.body;

    // Check if name already exists
    const existingType = await DocumentType.findOne({ name });
    if (existingType) {
      return res.status(400).json({ error: "Document type name already exists" });
    }

    const documentType = await DocumentType.create({
      name,
      displayName,
      description,
      category,
      allowedFileTypes: allowedFileTypes || ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
      maxFileSize: maxFileSize || 10485760,
      hasExpiry: hasExpiry || false,
      requiresMetadata: {
        metadataFields: metadataFields || []
      },
      sortOrder: sortOrder || 0,
      createdBy: req.user._id
    });

    const populatedType = await DocumentType.findById(documentType._id)
      .populate('createdBy', 'name email');

    res.status(201).json({ 
      message: "Document type created successfully",
      documentType: populatedType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update document type
export const updateDocumentType = async (req, res) => {
  try {
    const { typeId } = req.params;
    const updateData = req.body;

    // Don't allow changing the name if it would conflict
    if (updateData.name) {
      const existingType = await DocumentType.findOne({ 
        name: updateData.name, 
        _id: { $ne: typeId } 
      });
      if (existingType) {
        return res.status(400).json({ error: "Document type name already exists" });
      }
    }

    const documentType = await DocumentType.findByIdAndUpdate(
      typeId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!documentType) {
      return res.status(404).json({ error: "Document type not found" });
    }

    res.json({ 
      message: "Document type updated successfully",
      documentType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete document type
export const deleteDocumentType = async (req, res) => {
  try {
    const { typeId } = req.params;

    // Check if any documents are using this type
    const documentsCount = await Document.countDocuments({ documentType: typeId });
    if (documentsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete document type. ${documentsCount} documents are using this type.` 
      });
    }

    // Check if any verification rules are using this type
    const rulesCount = await VerificationRule.countDocuments({ 
      'requiredDocuments.documentType': typeId 
    });
    if (rulesCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete document type. It is required in ${rulesCount} verification rules.` 
      });
    }

    const documentType = await DocumentType.findByIdAndDelete(typeId);
    if (!documentType) {
      return res.status(404).json({ error: "Document type not found" });
    }

    res.json({ message: "Document type deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// VERIFICATION RULES MANAGEMENT

// Get all verification rules
export const getVerificationRules = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const rules = await VerificationRule.find(query)
      .populate('requiredDocuments.documentType', 'name displayName category')
      .populate('requiredDocuments.alternativeDocuments', 'name displayName')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ role: 1, createdAt: -1 });

    res.json({ verificationRules: rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create verification rule
export const createVerificationRule = async (req, res) => {
  try {
    const {
      role,
      requiredDocuments,
      minimumRequired,
      autoApproveThreshold,
      verificationMessage
    } = req.body;

    // Check if active rule already exists for this role
    const existingRule = await VerificationRule.findOne({ role, isActive: true });
    if (existingRule) {
      return res.status(400).json({ 
        error: `An active verification rule already exists for ${role} role` 
      });
    }

    const rule = await VerificationRule.create({
      role,
      requiredDocuments: requiredDocuments || [],
      minimumRequired: minimumRequired || 1,
      autoApproveThreshold,
      verificationMessage: verificationMessage || {},
      createdBy: req.user._id
    });

    const populatedRule = await VerificationRule.findById(rule._id)
      .populate('requiredDocuments.documentType', 'name displayName category')
      .populate('requiredDocuments.alternativeDocuments', 'name displayName')
      .populate('createdBy', 'name email');

    res.status(201).json({ 
      message: "Verification rule created successfully",
      verificationRule: populatedRule
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update verification rule
export const updateVerificationRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updateData = { ...req.body, lastModifiedBy: req.user._id };

    const rule = await VerificationRule.findByIdAndUpdate(
      ruleId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('requiredDocuments.documentType', 'name displayName category')
    .populate('requiredDocuments.alternativeDocuments', 'name displayName')
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email');

    if (!rule) {
      return res.status(404).json({ error: "Verification rule not found" });
    }

    res.json({ 
      message: "Verification rule updated successfully",
      verificationRule: rule
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete verification rule
export const deleteVerificationRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await VerificationRule.findByIdAndDelete(ruleId);
    if (!rule) {
      return res.status(404).json({ error: "Verification rule not found" });
    }

    res.json({ message: "Verification rule deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UTILITY FUNCTIONS

// Get available categories and file types
export const getConfigOptions = async (req, res) => {
  try {
    const categories = ["identity", "professional", "business", "education", "address", "other"];
    const roles = ["jobseeker", "recruiter", "consultant", "admin"];
    const fileTypes = [
      "application/pdf",
      "image/jpeg", 
      "image/jpg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    const fieldTypes = ["text", "number", "date", "select", "textarea"];

    res.json({
      categories,
      roles,
      fileTypes,
      fieldTypes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bulk operations for seeding
export const seedDefaultConfiguration = async (req, res) => {
  try {
    // Create default document types
    const defaultDocTypes = [
      {
        name: "government_id",
        displayName: "Government ID",
        description: "Government issued identification (Passport, National ID, Driver's License)",
        category: "identity",
        hasExpiry: true,
        metadataFields: [
          { fieldName: "documentNumber", fieldType: "text", label: "Document Number", required: true },
          { fieldName: "issuingAuthority", fieldType: "text", label: "Issuing Authority", required: true },
          { fieldName: "issueDate", fieldType: "date", label: "Issue Date", required: false },
          { fieldName: "expiryDate", fieldType: "date", label: "Expiry Date", required: false }
        ],
        sortOrder: 1,
        createdBy: req.user._id
      },
      {
        name: "business_registration",
        displayName: "Business Registration",
        description: "Company or business registration certificate",
        category: "business",
        metadataFields: [
          { fieldName: "registrationNumber", fieldType: "text", label: "Registration Number", required: true },
          { fieldName: "companyName", fieldType: "text", label: "Company Name", required: true },
          { fieldName: "registrationDate", fieldType: "date", label: "Registration Date", required: false }
        ],
        sortOrder: 2,
        createdBy: req.user._id
      },
      {
        name: "professional_certificate",
        displayName: "Professional Certificate",
        description: "Professional certification or license",
        category: "professional",
        hasExpiry: true,
        metadataFields: [
          { fieldName: "certificateName", fieldType: "text", label: "Certificate Name", required: true },
          { fieldName: "issuingOrganization", fieldType: "text", label: "Issuing Organization", required: true },
          { fieldName: "certificationDate", fieldType: "date", label: "Certification Date", required: false }
        ],
        sortOrder: 3,
        createdBy: req.user._id
      }
    ];

    // Create document types (skip if they exist)
    const createdTypes = [];
    for (const docType of defaultDocTypes) {
      const existing = await DocumentType.findOne({ name: docType.name });
      if (!existing) {
        const created = await DocumentType.create(docType);
        createdTypes.push(created);
      }
    }

    // Create default verification rules
    const govIdType = await DocumentType.findOne({ name: "government_id" });
    const businessRegType = await DocumentType.findOne({ name: "business_registration" });
    const profCertType = await DocumentType.findOne({ name: "professional_certificate" });

    const defaultRules = [
      {
        role: "jobseeker",
        requiredDocuments: [
          { documentType: govIdType._id, isRequired: true, priority: 1 }
        ],
        minimumRequired: 1,
        createdBy: req.user._id
      },
      {
        role: "recruiter", 
        requiredDocuments: [
          { documentType: govIdType._id, isRequired: true, priority: 1 },
          { documentType: businessRegType._id, isRequired: true, priority: 1 }
        ],
        minimumRequired: 2,
        createdBy: req.user._id
      },
      {
        role: "consultant",
        requiredDocuments: [
          { documentType: govIdType._id, isRequired: true, priority: 1 },
          { documentType: profCertType._id, isRequired: true, priority: 1 }
        ],
        minimumRequired: 2, 
        createdBy: req.user._id
      }
    ];

    // Create rules (skip if they exist)
    const createdRules = [];
    for (const rule of defaultRules) {
      const existing = await VerificationRule.findOne({ role: rule.role, isActive: true });
      if (!existing) {
        const created = await VerificationRule.create(rule);
        createdRules.push(created);
      }
    }

    res.json({
      message: "Default configuration seeded successfully",
      documentTypes: createdTypes.length,
      verificationRules: createdRules.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 