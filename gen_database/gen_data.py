import json
import random
from datetime import datetime, timedelta

# 1. Initialize a list of 24 unique VINs to distribute (ensuring 20 VINs for each system)
# Standard 17-character VIN structure
def generate_vin(index):
    return f"1HGCR2F83HA{str(index).zfill(6)}"

# Distribute VINs based on the requested ratio:
# 16 Shared VINs (80% of 20)
# 4 Sales-only VINs (20% of 20)
# 4 Service-only VINs (20% of 20)
shared_vins = [generate_vin(i) for i in range(1, 17)]        # 16 VINs
sales_only_vins = [generate_vin(i) for i in range(17, 21)]   # 4 VINs
service_only_vins = [generate_vin(i) for i in range(21, 25)] # 4 VINs

sales_vins = shared_vins + sales_only_vins     # Exactly 20 VINs
service_vins = shared_vins + service_only_vins # Exactly 20 VINs

# Shuffle lists randomly for a more natural data distribution
random.shuffle(sales_vins)
random.shuffle(service_vins)

# 2. Helper function to generate a random date within a range
def random_date(start_year=2024):
    start = datetime(start_year, 1, 1)
    end = datetime(2026, 10, 1)
    return (start + timedelta(days=random.randint(0, (end - start).days))).strftime("%Y-%m-%d")

# 3. Generate mock data for Sales System (20 records)
sales_docs = [
    "Sales_Contract", "Invoice_Bill_of_Sale", 
    "Finance_Lease_Agreement", "Insurance_Policy"
]
sales_data = []
for i, vin in enumerate(sales_vins):
    sales_data.append({
        "document_id": f"SAL-2026-{str(i+1).zfill(3)}",
        "vin": vin,
        "customer_id": f"CUST-SAL-{1000 + i}",
        "customer_name": random.choice(["John Doe", "Jane Smith", "Robert Johnson", "Emily Davis", "Michael Brown"]),
        "document_type": random.choice(sales_docs),
        "salesperson_name": random.choice(["Alice Green", "Alex Smith", "Sarah Connor"]),
        "sale_date": random_date(2024),
        "total_amount": random.randint(25000, 65000), # Amount in USD/EUR
        "status": "Completed",
        "file_url": f"https://sales.mock{str(i+1).zfill(3)}.pdf"
    })

# 4. Generate mock data for Service System (20 records)
service_docs = [
    "Repair_Order", "Multi_Point_Inspection", 
    "Parts_Invoice", "Warranty_Claim"
]
service_data = []
for i, vin in enumerate(service_vins):
    service_data.append({
        "document_id": f"SRV-2026-{str(i+1).zfill(3)}",
        "vin": vin,
        "customer_id": f"CUST-SRV-{2000 + i}",
        "customer_name": random.choice(["John Doe", "Jane Smith", "Robert Johnson", "Emily Davis", "Michael Brown"]),
        "document_type": random.choice(service_docs),
        "service_advisor": random.choice(["Michael Scott", "Dwight Schrute", "Jim Halpert"]),
        "technician_name": random.choice(["David Mechanic", "Paul Repair", "Tom Fixer"]),
        "service_date": random_date(2025), # Usually serviced after the purchase date
        "mileage_odometer": random.randint(5000, 45000),
        "total_cost": random.randint(50, 1500), # Cost in USD/EUR
        "status": "Closed",
        "file_url": f"https://service.mock{str(i+1).zfill(3)}.pdf"
    })

# 5. Export data to JSON files
with open('sales_data.json', 'w', encoding='utf-8') as f:
    json.dump(sales_data, f, ensure_ascii=False, indent=2)

with open('service_data.json', 'w', encoding='utf-8') as f:
    json.dump(service_data, f, ensure_ascii=False, indent=2)

print("Successfully generated 'sales_data.json' and 'service_data.json'!")
print(f"Total overlapping VINs: {len(set(sales_vins) & set(service_vins))} out of 20 (80% overlap)")
