export interface GoogleContactName {
  displayName?: string;
  givenName?: string;
  familyName?: string;
}

export interface GoogleContactEmail {
  value: string;
  type?: string;
  formattedType?: string;
}

export interface GoogleContactPhone {
  value: string;
  type?: string;
  formattedType?: string;
}

export interface GoogleContactOrganization {
  name?: string;
  title?: string;
  department?: string;
}

export interface GoogleContactPhoto {
  url?: string;
  default?: boolean;
}

export interface GoogleContactAddress {
  formattedValue?: string;
  city?: string;
  country?: string;
  type?: string;
}

export interface GoogleContactBio {
  value?: string;
  contentType?: string;
}

export interface GoogleContactUserDefined {
  key: string;
  value: string;
}

export interface GoogleContact {
  resourceName: string; // e.g. "people/c1234567890"
  etag: string;
  names?: GoogleContactName[];
  emailAddresses?: GoogleContactEmail[];
  phoneNumbers?: GoogleContactPhone[];
  organizations?: GoogleContactOrganization[];
  photos?: GoogleContactPhoto[];
  addresses?: GoogleContactAddress[];
  biographies?: GoogleContactBio[];
  userDefined?: GoogleContactUserDefined[];
}

export interface NewContactPayload {
  givenName: string;
  familyName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  notes?: string;
  address?: string;
  userDefined?: { key: string; value: string }[];
}

const PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,organizations,photos,addresses,biographies,userDefined';

/**
 * List all Google Contacts for the authenticated user
 */
export async function fetchGoogleContacts(
  accessToken: string,
  pageSize: number = 100,
  pageToken?: string
): Promise<{ connections: GoogleContact[]; totalPeople: number; nextPageToken?: string }> {
  let url = `https://people.googleapis.com/v1/people/me/connections?personFields=${PERSON_FIELDS}&pageSize=${pageSize}&sortOrder=FIRST_NAME_ASCENDING`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch contacts (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return {
    connections: data.connections || [],
    totalPeople: data.totalPeople || (data.connections?.length || 0),
    nextPageToken: data.nextPageToken
  };
}

/**
 * Search Google Contacts by keyword/name/email/phone
 */
export async function searchGoogleContacts(
  accessToken: string,
  query: string
): Promise<GoogleContact[]> {
  if (!query || !query.trim()) return [];

  const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
    query.trim()
  )}&readMask=${PERSON_FIELDS}&pageSize=30`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to search contacts: ${res.statusText}`);
  }

  const data = await res.json();
  const results = data.results || [];
  return results.map((r: any) => r.person).filter(Boolean);
}

/**
 * Create a new Contact in Google Contacts
 */
export async function createGoogleContact(
  accessToken: string,
  contact: NewContactPayload
): Promise<GoogleContact> {
  const body: any = {
    names: [
      {
        givenName: contact.givenName,
        familyName: contact.familyName || '',
        displayName: `${contact.givenName} ${contact.familyName || ''}`.trim()
      }
    ]
  };

  if (contact.email?.trim()) {
    body.emailAddresses = [{ value: contact.email.trim(), type: 'work' }];
  }

  if (contact.phone?.trim()) {
    body.phoneNumbers = [{ value: contact.phone.trim(), type: 'mobile' }];
  }

  if (contact.company || contact.jobTitle || contact.department) {
    body.organizations = [
      {
        name: contact.company || 'Saudi Fleet & Logistics',
        title: contact.jobTitle || '',
        department: contact.department || ''
      }
    ];
  }

  if (contact.notes?.trim()) {
    body.biographies = [{ value: contact.notes.trim(), contentType: 'TEXT_PLAIN' }];
  }

  if (contact.address?.trim()) {
    body.addresses = [{ formattedValue: contact.address.trim(), type: 'work' }];
  }

  if (contact.userDefined && contact.userDefined.length > 0) {
    body.userDefined = contact.userDefined;
  }

  const res = await fetch(`https://people.googleapis.com/v1/people:createContact?personFields=${PERSON_FIELDS}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to create contact: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Update an existing Contact in Google Contacts
 */
export async function updateGoogleContact(
  accessToken: string,
  resourceName: string,
  etag: string,
  contact: NewContactPayload
): Promise<GoogleContact> {
  const body: any = {
    etag,
    names: [
      {
        givenName: contact.givenName,
        familyName: contact.familyName || '',
        displayName: `${contact.givenName} ${contact.familyName || ''}`.trim()
      }
    ]
  };

  if (contact.email?.trim()) {
    body.emailAddresses = [{ value: contact.email.trim(), type: 'work' }];
  } else {
    body.emailAddresses = [];
  }

  if (contact.phone?.trim()) {
    body.phoneNumbers = [{ value: contact.phone.trim(), type: 'mobile' }];
  } else {
    body.phoneNumbers = [];
  }

  if (contact.company || contact.jobTitle || contact.department) {
    body.organizations = [
      {
        name: contact.company || '',
        title: contact.jobTitle || '',
        department: contact.department || ''
      }
    ];
  }

  if (contact.notes !== undefined) {
    body.biographies = [{ value: contact.notes || '', contentType: 'TEXT_PLAIN' }];
  }

  if (contact.address?.trim()) {
    body.addresses = [{ formattedValue: contact.address.trim(), type: 'work' }];
  }

  if (contact.userDefined) {
    body.userDefined = contact.userDefined;
  }

  const updateMask = 'names,emailAddresses,phoneNumbers,organizations,biographies,addresses,userDefined';

  const res = await fetch(
    `https://people.googleapis.com/v1/${resourceName}:updateContact?updatePersonFields=${updateMask}&personFields=${PERSON_FIELDS}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to update contact: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Delete a contact from Google Contacts (destructive action)
 */
export async function deleteGoogleContact(
  accessToken: string,
  resourceName: string
): Promise<void> {
  const res = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to delete contact: ${res.statusText}`);
  }
}

/**
 * Sync a Fleet Worker / Driver directly to Google Contacts
 */
export async function syncWorkerToGoogleContacts(
  accessToken: string,
  worker: {
    name: string;
    jobTitle?: string;
    department?: string;
    phone?: string;
    email?: string;
    iqamaNumber?: string;
    nationality?: string;
    workerId?: string;
    assignedVehiclePlate?: string;
  }
): Promise<GoogleContact> {
  const safeName = (worker?.name || 'Staff Member').trim();
  const parts = safeName.split(' ').filter(Boolean);
  const givenName = parts[0] || safeName;
  const familyName = parts.slice(1).join(' ') || '';

  const notes = [
    `Saudi Fleet & Workforce ID: ${worker.workerId || 'N/A'}`,
    `Iqama / National ID: ${worker.iqamaNumber || 'N/A'}`,
    `Role: ${worker.jobTitle || 'Fleet Staff'}`,
    `Department: ${worker.department || 'Logistics'}`,
    `Nationality: ${worker.nationality || 'Saudi Arabia'}`,
    worker.assignedVehiclePlate ? `Assigned Vehicle Plate: ${worker.assignedVehiclePlate}` : ''
  ].filter(Boolean).join('\n');

  const userDefined = [
    { key: 'Fleet Worker ID', value: worker.workerId || 'N/A' },
    { key: 'Iqama / ID', value: worker.iqamaNumber || 'N/A' },
    { key: 'Fleet Role', value: worker.jobTitle || 'Fleet Staff' }
  ];

  if (worker.assignedVehiclePlate) {
    userDefined.push({ key: 'Assigned Vehicle', value: worker.assignedVehiclePlate });
  }

  return await createGoogleContact(accessToken, {
    givenName,
    familyName,
    email: worker.email || `${worker.name.toLowerCase().replace(/\s+/g, '.')}@saudifleet.com.sa`,
    phone: worker.phone || '+966 50 000 0000',
    company: 'Saudi Fleet & Logistics Operations',
    jobTitle: worker.jobTitle || 'Driver / Fleet Staff',
    department: worker.department || 'Logistics & Supply Chain',
    notes,
    userDefined
  });
}
