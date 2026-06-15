# 04 - Licence, Compliance and Readiness Module

Purpose: Manage MOF, CIDB, statutory compliance, expiry alerts and readiness score.

Sub-modules:
- MOF Register
- MOF Kod Bidang Matrix
- CIDB Register
- PPK, SPKK and STB
- CIDB Grade, Category and Specialization
- KWSP, SOCSO and EIS
- LHDN, SST and HRD
- Licence Expiry Centre
- Compliance Risk Status
- Readiness Score

Workflow:
Company Passport -> Licence Register -> MOF/CIDB/Statutory Records -> Compliance Engine -> Expiry Alert and Missing Evidence -> Readiness Score -> Tender Matching.

Tables:
- licences
- mof_codes
- cidb_registrations
- cidb_specializations
- statutory_compliance
- scoring_rules
- scoring_weights
- scoring_versions

Routes:
- licence
- compliance
- readiness

Outputs:
- Licence Matrix
- MOF Kod Bidang Matrix
- CIDB Capability Matrix
- Expiry Alert Report
- Compliance Readiness Report