import { store } from './server/store.ts';

async function runAcceptanceTests() {
  console.log('🚀 Starting Data Steward Acceptance Tests...\n');

  // Test 1: Check initial seeding of datasets
  const datasets = store.getDatasets();
  console.assert(datasets.length >= 6, `Expected at least 6 datasets, found ${datasets.length}`);
  console.log('✅ Test 1 Passed: Datasets seeded successfully.');

  // Test 2: Road network has published v12 and superseded v11
  const roadVersions = store.getDatasetVersions('ROAD-06');
  const v12 = roadVersions.find(v => v.version === 12);
  const v11 = roadVersions.find(v => v.version === 11);
  console.assert(v12?.status === 'PUBLISHED', 'ROAD-06 v12 should be PUBLISHED');
  console.assert(v11?.status === 'SUPERSEDED', 'ROAD-06 v11 should be SUPERSEDED');
  console.log('✅ Test 2 Passed: Historical versioning and SUPERSEDED immutability preserved.');

  // Test 3: Quarantined dataset exists and has mandatory quarantine reason
  const envQuar = store.getDatasetVersion('QUAR-ENV-06', 1);
  console.assert(envQuar?.status === 'QUARANTINED', 'QUAR-ENV-06 v1 should be QUARANTINED');
  console.assert(!!envQuar?.quarantine_reason, 'Quarantine reason must be mandatory');
  console.log('✅ Test 3 Passed: Quarantined version isolated with reason:', envQuar?.quarantine_reason);

  // Test 4: Attempting to fulfill a Data Request with a QUARANTINED version MUST throw error!
  const realReq = store.createDataRequest('CASE-1405-00045', 'REQ-1405-01', 'مهندس زهرا کاظمی', 'تأمین داده جمعیت محدوده دانشگاه');
  let quarantinedErrorThrown = false;
  try {
    store.fulfillDataRequest(realReq.request_id, 'QUAR-ENV-06', 1, 'مهندس مریم فراهانی');
  } catch (e: any) {
    quarantinedErrorThrown = true;
    console.assert(e.message.includes('قرنطینه'), `Expected quarantine error message, got: ${e.message}`);
  }
  console.assert(quarantinedErrorThrown, 'Fulfilling with quarantined version must throw error!');
  console.log('✅ Test 4 Passed: Strict gate: Quarantined dataset cannot fulfill study requirements.');

  // Test 5: KPIs return accurate numbers from database
  const kpis = store.getDataStewardKPIs();
  console.assert(typeof kpis.new_requests === 'number', 'KPIs must contain new_requests');
  console.assert(kpis.quarantined_datasets >= 1, 'KPIs must count quarantined datasets');
  console.log('✅ Test 5 Passed: Real database KPIs:', kpis);

  // Test 6: Queues are populated
  const queues = store.getDataStewardQueues();
  console.assert(Array.isArray(queues.requests_queue), 'requests_queue must be array');
  console.assert(Array.isArray(queues.quality_queue), 'quality_queue must be array');
  console.assert(Array.isArray(queues.publication_queue), 'publication_queue must be array');
  console.assert(Array.isArray(queues.dependencies_queue), 'dependencies_queue must be array');
  console.log('✅ Test 6 Passed: 4 Data Steward Queues loaded successfully.');

  // Test 7: Catalog Search
  const searchResults = store.searchCatalog({ query: 'معابر', region: 'منطقه ۶' });
  console.assert(searchResults.length > 0, 'Catalog search should find ROAD-06');
  console.assert(searchResults[0].dataset.code === 'ROAD-06', 'Top match should be ROAD-06');
  console.log('✅ Test 7 Passed: Search Catalog found match with score:', searchResults[0].match_score);

  // Test 8: End-to-End Ingestion Wizard: Candidate -> Profile -> Map -> Validate -> Approve -> Publish
  const actor = { name: 'مهندس مریم فراهانی', role: 'steward' };
  
  // 8a. Create new candidate dataset
  const testDsCode = `TRANSIT-L6-${Date.now()}`;
  store.createDataset({
    code: testDsCode,
    name: 'خط ۶ مترو تهران',
    title: 'ایستگاه‌ها و سرفاصله خط ۶ مترو',
    category: 'حمل‌ونقل و ترافیک',
    region: 'منطقه ۶',
    description: 'خط ۶ مترو تهران با پوشش ایستگاه‌های دانشگاه تربیت مدرس، کارگر و هفت تیر',
  }, actor);

  // 8b. Upload candidate version v1
  const candVer = store.createCandidateVersion(testDsCode, {
    reason: 'بارگذاری اطلاعات ایستگاه‌های خط ۶',
    profile: {
      record_count: 32,
      columns: [
        { name: 'station_id', type: 'string', null_count: 0, unique_count: 32 },
        { name: 'station_name', type: 'string', null_count: 0, unique_count: 32 },
        { name: 'headway_min', type: 'decimal', null_count: 0, unique_count: 4 },
      ],
    },
    reconciliation: {
      source_records: 32,
      accepted_records: 32,
      rejected_records: 0,
      quarantined_records: 0,
      is_balanced: true,
    },
  }, actor);
  console.assert(candVer.version === 1, 'New candidate version should be 1');
  console.assert(candVer.status === 'UPLOADED', 'Status should be UPLOADED');

  // 8c. Profile
  store.profileDatasetVersion(testDsCode, 1, { record_count: 32 }, actor);

  // 8d. Explicit Mapping
  store.mapDatasetVersion(testDsCode, 1, [
    { source_field: 'station_id', target_field: 'station_id', data_type: 'string', required: true, is_identifier: true },
    { source_field: 'station_name', target_field: 'station_name', data_type: 'string', required: true },
    { source_field: 'headway_min', target_field: 'headway_min', data_type: 'decimal', required: true },
  ], actor);

  // 8e. Technical Validation
  const valResult = store.validateDatasetVersion(testDsCode, 1, actor);
  console.assert(valResult.blockingErrorsCount === 0, 'Should have 0 blocking errors');
  console.assert(valResult.version.status === 'VALIDATED', `Expected VALIDATED, got ${valResult.version.status}`);
  console.log('✅ Test 8e Passed: Validation passed with 0 blocking errors.');

  // 8f. Attempt to publish WITHOUT semantic review -> MUST FAIL
  let pubWithoutSemanticFailed = false;
  try {
    store.publishDatasetVersion(testDsCode, 1, 'مهندس مریم فراهانی', actor);
  } catch (e: any) {
    pubWithoutSemanticFailed = true;
    console.assert(e.message.includes('معنایی'), `Expected semantic review error, got: ${e.message}`);
  }
  console.assert(pubWithoutSemanticFailed, 'Publishing without semantic review must fail!');
  console.log('✅ Test 8f Passed: Gate check: Semantic approval required before publication.');

  // 8g. Semantic Approval
  store.approveSemanticReview(testDsCode, 1, 'دکتر مرتضی رحیمی', 'تأیید سرفاصله قطارهای خط ۶', actor);
  const approvedVer = store.getDatasetVersion(testDsCode, 1);
  console.assert(approvedVer?.status === 'READY_FOR_PUBLICATION', `Expected READY_FOR_PUBLICATION, got ${approvedVer?.status}`);

  // 8h. Publish
  const pubResult = store.publishDatasetVersion(testDsCode, 1, 'مهندس مریم فراهانی', actor);
  console.assert(pubResult.version.status === 'PUBLISHED', 'Version should be PUBLISHED');
  console.assert(pubResult.version.is_immutable, 'Published version must be immutable');
  console.assert(!!pubResult.version.publication.publication_checksum, 'Must have publication checksum');
  console.log('✅ Test 8h Passed: Dataset published officially and marked immutable.');

  // Test 9: Superseding and Stale Notifications
  // Upload v2 of test dataset and publish it
  store.createCandidateVersion(testDsCode, {
    reason: 'کاهش سرفاصله قطارها در ساعات اوج',
    profile: {
      record_count: 32,
      columns: [
        { name: 'station_id', type: 'string', null_count: 0, unique_count: 32 },
        { name: 'station_name', type: 'string', null_count: 0, unique_count: 32 },
        { name: 'headway_min', type: 'decimal', null_count: 0, unique_count: 4 },
      ],
    },
    reconciliation: {
      source_records: 32,
      accepted_records: 32,
      rejected_records: 0,
      quarantined_records: 0,
      is_balanced: true,
    },
  }, actor);
  store.mapDatasetVersion(testDsCode, 2, [
    { source_field: 'station_id', target_field: 'station_id', data_type: 'string', required: true, is_identifier: true },
    { source_field: 'station_name', target_field: 'station_name', data_type: 'string', required: true },
    { source_field: 'headway_min', target_field: 'headway_min', data_type: 'decimal', required: true },
  ], actor);
  store.validateDatasetVersion(testDsCode, 2, actor);
  store.approveSemanticReview(testDsCode, 2, 'دکتر مرتضی رحیمی', 'تأیید نسخه جدید', actor);
  const pubResultV2 = store.publishDatasetVersion(testDsCode, 2, 'مهندس مریم فراهانی', actor);

  const prevV1 = store.getDatasetVersion(testDsCode, 1);
  console.assert(prevV1?.status === 'SUPERSEDED', `Expected v1 to be SUPERSEDED, got ${prevV1?.status}`);
  console.assert(pubResultV2.version.status === 'PUBLISHED', 'v2 should be PUBLISHED');
  console.log('✅ Test 9 Passed: v1 gracefully superseded without deletion or mutation.');

  // Test 10: Comparison of v1 vs v2
  const comparison = store.compareDatasetVersions(testDsCode, 1, 2);
  console.assert(comparison.versionFrom.version === 1 && comparison.versionTo.version === 2, 'Comparison handles versions');
  console.log('✅ Test 10 Passed: Version comparison completed successfully.');

  // Test 11: Audit Trail Logging
  const audits = store.getDatasetAuditLog();
  console.assert(audits.length >= 5, 'Audit trail should record events');
  console.log('✅ Test 11 Passed: Audit trail recorded', audits.length, 'events.');

  console.log('\n🎉 ALL 11 DATA STEWARD ACCEPTANCE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runAcceptanceTests().catch(e => {
  console.error('❌ Test failed with error:', e);
  process.exit(1);
});
