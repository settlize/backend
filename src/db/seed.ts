import "dotenv/config";
import {
  expenseSplits,
  expenses,
  groupMembers,
  groups,
  settlements,
} from "../db/schema.js";
import { db } from "../lib/auth.js";

function expectOne<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) {
    throw new Error("insert returned no rows");
  }
  return row;
}

async function seed() {
  console.log("Seeding...");

  const [alice, bob, carol] = await db.query.user.findMany();
  if (!alice || !bob) {
    console.error(
      "Need at least 2 signed-up users before seeding (POST /api/auth/sign-up/email).",
    );
    process.exit(1);
  }

  await db.transaction(async (tx) => {
    const trip = expectOne(
      await tx
        .insert(groups)
        .values({
          name: "Portugal Trip",
          defaultCurrency: "EUR",
          createdBy: alice.id,
        })
        .returning(),
    );

    await tx
      .insert(groupMembers)
      .values([
        { groupId: trip.id, userId: alice.id, role: "admin" },
        { groupId: trip.id, userId: bob.id, role: "member" },
        ...(carol ? [{ groupId: trip.id, userId: carol.id }] : []),
      ]);

    // 1) equal split: 90.00 EUR groceries, 3-way => 3000/3000/3000
    const groceries = expectOne(
      await tx
        .insert(expenses)
        .values({
          groupId: trip.id,
          description: "Groceries",
          amount: 9000,
          currency: "EUR",
          paidById: alice.id,
          date: new Date("2026-08-01"),
          category: "food",
          splitType: "equal",
        })
        .returning(),
    );

    await tx.insert(expenseSplits).values(
      [alice, bob, carol].flatMap((u) =>
        u
          ? [
              {
                expenseId: groceries.id,
                userId: u.id,
                shareValue: 1,
                computedShare: 3000,
              },
            ]
          : [],
      ),
    );

    // 2) shares split w/ non-participant payer: Alice pays 50.00 for bob:carol 2:1
    //    => bob 3333, carol 1667 (leftover cent -> largest remainder: carol)
    const gift = expectOne(
      await tx
        .insert(expenses)
        .values({
          groupId: trip.id,
          description: "Surf course (Alice not attending)",
          amount: 5000,
          currency: "EUR",
          paidById: alice.id,
          date: new Date("2026-08-02"),
          category: "entertainment",
          splitType: "shares",
        })
        .returning(),
    );

    await tx.insert(expenseSplits).values([
      {
        expenseId: gift.id,
        userId: bob.id,
        shareValue: 2,
        computedShare: 3333,
      },
      ...(carol
        ? [
            {
              expenseId: gift.id,
              userId: carol.id,
              shareValue: 1,
              computedShare: 1667,
            },
          ]
        : []),
    ]);

    // 3) exact split: dinner 120.00 => 70.00 / 50.00
    const dinner = expectOne(
      await tx
        .insert(expenses)
        .values({
          groupId: trip.id,
          description: "Dinner",
          amount: 12000,
          currency: "EUR",
          paidById: bob.id,
          date: new Date("2026-08-03"),
          category: "food",
          splitType: "exact",
        })
        .returning(),
    );

    await tx.insert(expenseSplits).values([
      {
        expenseId: dinner.id,
        userId: alice.id,
        shareValue: 7000,
        computedShare: 7000,
      },
      {
        expenseId: dinner.id,
        userId: bob.id,
        shareValue: 5000,
        computedShare: 5000,
      },
    ]);

    // 4) percent split: 100.00 => 33.33% / 33.33% / 33.34% (bps)
    if (carol) {
      const taxi = expectOne(
        await tx
          .insert(expenses)
          .values({
            groupId: trip.id,
            description: "Airport taxi",
            amount: 10000,
            currency: "EUR",
            paidById: carol.id,
            date: new Date("2026-08-04"),
            category: "transport",
            splitType: "percent",
          })
          .returning(),
      );

      await tx.insert(expenseSplits).values([
        {
          expenseId: taxi.id,
          userId: alice.id,
          shareValue: 3333,
          computedShare: 3333,
        },
        {
          expenseId: taxi.id,
          userId: bob.id,
          shareValue: 3333,
          computedShare: 3333,
        },
        {
          expenseId: taxi.id,
          userId: carol.id,
          shareValue: 3334,
          computedShare: 3334,
        },
      ]);
    }

    // settlement: bob paid alice 25.00 directly
    await tx.insert(settlements).values({
      groupId: trip.id,
      payerId: bob.id,
      payeeId: alice.id,
      amount: 2500,
      currency: "EUR",
      date: new Date("2026-08-05"),
    });
  });

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
