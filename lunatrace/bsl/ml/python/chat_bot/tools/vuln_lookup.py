import json

from langchain.tools import BaseTool
from pprint import pformat
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
from scrape_utils.read_anything import read
# Select your transport with a defined url endpoint
transport = AIOHTTPTransport(url="http://localhost:4455/v1/graphql")

# Create a GraphQL client using the defined transport
client = Client(transport=transport, fetch_schema_from_transport=True)

query = gql(
	"""
	query GetVulnDetails($cve_id: String!) {
	  vulnerability(where: {cve_id: {_eq: $cve_id}, source: {_eq: "ghsa"}}) {
		id
		cve_id
		details
		summary
		cvss_score
		severity_name
		affected {
		  ranges {
			introduced
			fixed
		  }
		  package {
			name
			package_manager
		  }
		}
		references {
      url
      reference_content {
        id
        title
        summary
      }
    }
      code_snippets {
        id
        language
        score
        summary
        source_url
      }
	  }
	}
"""
)


class VulnLookupTool(BaseTool):
	name = "VulnLookup"
	description = "Useful to look up vulnerability details about a given vulnerability by inputting the CVE name (like CVE-XXX-XXXXX) once you know it. Useful to determine basic vulnerability information, affected packages, fix versions, and so on. Don't just guess a CVE number, if you don't know it you should google it first."

	def _run(self, input: str) -> str:
		"""Use the tool."""
		cve_id, instruction = json.loads(input)

		result = client.execute(query, variable_values={'cve_id':cve_id})
		return read(str(result), instruction + '. Also give me the most relevant advisory IDs and snippet IDs from the results, if any.' )

	async def _arun(self, query: str) -> str:
		"""Use the tool asynchronously."""
		raise NotImplementedError("not implemented")
