/* eslint no-console: 0 */
/* tslint:disable: no-console max-line-length */
import * as store from '../lib/db/store';
import * as dbobjects from '../lib/db/objects';
import * as dbtypes from '../lib/db/db-types';
import * as credentialsmgr from '../lib/training/credentials';

const opsArgs = process.argv.slice(2);

if (opsArgs.length !== 2) {
    console.log('usage: node add-tenant-to-pool.js tenantid maxusers');
    process.exit(-1); // eslint-disable-line
}

const tenantid  = opsArgs[0];
const maxusers  = parseInt(opsArgs[1], 10);
const maxprojects = 2;

console.log('tenant           :', tenantid);
console.log('class students   :', maxusers);


function sameProjectTypes(a: dbtypes.ProjectTypeLabel[], b: dbtypes.ProjectTypeLabel[]): boolean
{
    return a.length === b.length && a.slice().sort().join(',') === b.slice().sort().join(',');
}


async function addTenantToPool(): Promise<dbtypes.ClassTenant>
{
    const exists = await store.checkIfTenantExists(tenantid);

    if (!exists) {
        console.log('creating tenant record...');
        return store.storeManagedClassTenant(tenantid, maxusers, maxprojects, dbtypes.ClassTenantType.ManagedPool);
    }

    console.log('tenant record already exists - checking if it can be safely updated...');

    const existing = await store.getClassTenant(tenantid);
    const expected = dbobjects.getDefaultClassTenant(tenantid);

    const onlyExpiryIsDifferent =
        existing.tenantType === expected.tenantType &&
        existing.maxUsers === expected.maxUsers &&
        existing.maxProjectsPerUser === expected.maxProjectsPerUser &&
        sameProjectTypes(existing.supportedProjectTypes, expected.supportedProjectTypes) &&
        existing.textClassifierExpiry !== expected.textClassifierExpiry;

    if (!onlyExpiryIsDifferent) {
        throw new Error('Existing tenant record is not in a recognised state - refusing to modify it automatically');
    }

    // an unmanaged tenant's text classifiers are trained using their own Watson API keys
    //  (in the bluemixcredentials table). Moving them into the managed pool means their
    //  students will use the site's own pool of keys (bluemixcredentialspool) instead, so
    //  any of their own keys - and the classifiers trained with them - would be orphaned
    //  if left behind. They need to be cleaned up before the tenant record is updated.
    const ownCredentials = await store.getBluemixCredentialsByClassId(tenantid, 'conv');
    for (const credentials of ownCredentials) {
        console.log('removing unmanaged text classifier credentials', credentials.id, '...');
        await credentialsmgr.deleteBluemixCredentials(credentials);
    }

    console.log('existing tenant record only has a customised text classifier expiry - updating it to add to the pool...');
    return store.updateManagedClassTenant(tenantid, maxusers, maxprojects, dbtypes.ClassTenantType.ManagedPool);
}


console.log('');
console.log('connecting to DB...');
store.init()
    .then(() => {
        return addTenantToPool();
    })
    .then((newtenant) => {
        console.log('done:', newtenant);
    })
    .catch((err) => {
        console.error(err);
    })
    .finally(() => {
        return store.disconnect();
    });
